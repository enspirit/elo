import { describe, it } from "bun:test";
import assert from "node:assert";
import {
  StdLib,
  signatureKey,
  typeGeneralizations,
  simpleBinaryOp,
  binaryOp,
  unaryOp,
  methodCall,
  nullary,
  unaryMethod,
  fnCall,
  EmitContext,
} from "../../src/stdlib";
import { Types } from "../../src/types";
import { IRExpr, irInt, irFloat, irVariable, irDuration } from "../../src/ir";

describe("signatureKey", () => {
  it("should create key for nullary function", () => {
    assert.strictEqual(signatureKey("today", []), "today");
  });

  it("should create key for unary function", () => {
    assert.strictEqual(signatureKey("neg", [Types.int]), "neg:int");
    assert.strictEqual(signatureKey("not", [Types.bool]), "not:bool");
  });

  it("should create key for binary function", () => {
    assert.strictEqual(
      signatureKey("add", [Types.int, Types.int]),
      "add:int,int",
    );
    assert.strictEqual(
      signatureKey("add", [Types.float, Types.int]),
      "add:float,int",
    );
  });

  it("should create key with any type", () => {
    assert.strictEqual(
      signatureKey("add", [Types.any, Types.int]),
      "add:any,int",
    );
    assert.strictEqual(
      signatureKey("eq", [Types.any, Types.any]),
      "eq:any,any",
    );
  });

  it("should create key for temporal types", () => {
    assert.strictEqual(
      signatureKey("add", [Types.date, Types.duration]),
      "add:date,duration",
    );
    assert.strictEqual(
      signatureKey("sub", [Types.datetime, Types.duration]),
      "sub:datetime,duration",
    );
  });
});

describe("typeGeneralizations", () => {
  it("should return empty array only for empty input", () => {
    const result = typeGeneralizations([]);
    assert.deepStrictEqual(result, [[]]);
  });

  it("should return all generalizations for unary type", () => {
    const result = typeGeneralizations([Types.int]);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], [Types.int]);
    assert.deepStrictEqual(result[1], [Types.any]);
  });

  it("should return all generalizations for binary types", () => {
    const result = typeGeneralizations([Types.int, Types.float]);
    assert.strictEqual(result.length, 4);
    assert.deepStrictEqual(result[0], [Types.int, Types.float]);
    assert.deepStrictEqual(result[1], [Types.any, Types.float]);
    assert.deepStrictEqual(result[2], [Types.int, Types.any]);
    assert.deepStrictEqual(result[3], [Types.any, Types.any]);
  });

  it("should not duplicate when types already include any", () => {
    const result = typeGeneralizations([Types.int, Types.any]);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], [Types.int, Types.any]);
    assert.deepStrictEqual(result[1], [Types.any, Types.any]);
  });

  it("should return single element for all-any types", () => {
    const result = typeGeneralizations([Types.any, Types.any]);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], [Types.any, Types.any]);
  });

  it("should handle ternary types", () => {
    const result = typeGeneralizations([Types.int, Types.float, Types.bool]);
    // 2^3 = 8 combinations
    assert.strictEqual(result.length, 8);
    // First should be all concrete, last should be all any
    assert.deepStrictEqual(result[0], [Types.int, Types.float, Types.bool]);
    assert.deepStrictEqual(result[7], [Types.any, Types.any, Types.any]);
  });
});

describe("StdLib", () => {
  // Helper to create a simple emit context for testing
  function createTestContext(): EmitContext<string> {
    const emit = (ir: IRExpr): string => {
      if (ir.type === "int_literal") return ir.value.toString();
      if (ir.type === "float_literal") return ir.value.toString();
      if (ir.type === "variable") return ir.name;
      return "?";
    };
    return {
      emit,
      emitWithParens: (ir, _op, _side) => emit(ir),
    };
  }

  describe("register and lookup", () => {
    it("should register and lookup a function", () => {
      const lib = new StdLib<string>();
      const emitter = () => "result";
      lib.register("test", [Types.int], emitter);

      const found = lib.lookup("test", [Types.int]);
      assert.strictEqual(found, emitter);
    });

    it("should return undefined for unregistered function", () => {
      const lib = new StdLib<string>();
      const found = lib.lookup("unknown", [Types.int]);
      assert.strictEqual(found, undefined);
    });

    it("should distinguish between different signatures", () => {
      const lib = new StdLib<string>();
      const intEmitter = () => "int";
      const floatEmitter = () => "float";

      lib.register("neg", [Types.int], intEmitter);
      lib.register("neg", [Types.float], floatEmitter);

      assert.strictEqual(lib.lookup("neg", [Types.int]), intEmitter);
      assert.strictEqual(lib.lookup("neg", [Types.float]), floatEmitter);
    });

    it("should support chained registration", () => {
      const lib = new StdLib<string>();
      lib
        .register("add", [Types.int, Types.int], () => "int+int")
        .register("add", [Types.float, Types.float], () => "float+float")
        .register("sub", [Types.int, Types.int], () => "int-int");

      assert.ok(lib.lookup("add", [Types.int, Types.int]));
      assert.ok(lib.lookup("add", [Types.float, Types.float]));
      assert.ok(lib.lookup("sub", [Types.int, Types.int]));
    });

    it("should fall back to any,any when registered", () => {
      const lib = new StdLib<string>();
      const anyAnyEmitter = () => "any+any";
      lib.register("add", [Types.any, Types.any], anyAnyEmitter);

      // Looking up with concrete types should find the any,any registration
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.int]),
        anyAnyEmitter,
      );
      assert.strictEqual(
        lib.lookup("add", [Types.float, Types.string]),
        anyAnyEmitter,
      );
      assert.strictEqual(
        lib.lookup("add", [Types.date, Types.duration]),
        anyAnyEmitter,
      );
    });

    it("should prefer specific over generalized registration", () => {
      const lib = new StdLib<string>();
      const intIntEmitter = () => "int+int";
      const anyAnyEmitter = () => "any+any";
      lib.register("add", [Types.int, Types.int], intIntEmitter);
      lib.register("add", [Types.any, Types.any], anyAnyEmitter);

      // int,int should use specific implementation
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.int]),
        intIntEmitter,
      );
      // float,float should use any,any fallback
      assert.strictEqual(
        lib.lookup("add", [Types.float, Types.float]),
        anyAnyEmitter,
      );
    });

    it("should support partial generalization (any,T)", () => {
      const lib = new StdLib<string>();
      const anyIntEmitter = () => "any+int";
      lib.register("add", [Types.any, Types.int], anyIntEmitter);

      // float,int should match any,int
      assert.strictEqual(
        lib.lookup("add", [Types.float, Types.int]),
        anyIntEmitter,
      );
      // date,int should match any,int
      assert.strictEqual(
        lib.lookup("add", [Types.date, Types.int]),
        anyIntEmitter,
      );
      // int,float should NOT match (right type is wrong)
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.float]),
        undefined,
      );
    });

    it("should support partial generalization (T,any)", () => {
      const lib = new StdLib<string>();
      const intAnyEmitter = () => "int+any";
      lib.register("add", [Types.int, Types.any], intAnyEmitter);

      // int,float should match int,any
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.float]),
        intAnyEmitter,
      );
      // int,date should match int,any
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.date]),
        intAnyEmitter,
      );
      // float,int should NOT match (left type is wrong)
      assert.strictEqual(
        lib.lookup("add", [Types.float, Types.int]),
        undefined,
      );
    });

    it("should try generalizations in correct order", () => {
      const lib = new StdLib<string>();
      const intAnyEmitter = () => "int+any";
      const anyAnyEmitter = () => "any+any";
      lib.register("add", [Types.int, Types.any], intAnyEmitter);
      lib.register("add", [Types.any, Types.any], anyAnyEmitter);

      // int,float should prefer int,any over any,any
      assert.strictEqual(
        lib.lookup("add", [Types.int, Types.float]),
        intAnyEmitter,
      );
      // float,int should use any,any (no match for any,int or float,any)
      assert.strictEqual(
        lib.lookup("add", [Types.float, Types.int]),
        anyAnyEmitter,
      );
    });
  });

  describe("emit", () => {
    it("should emit using registered implementation", () => {
      const lib = new StdLib<string>();
      lib.register("add", [Types.int, Types.int], (args, ctx) => {
        return `${ctx.emit(args[0])} + ${ctx.emit(args[1])}`;
      });

      const args: IRExpr[] = [irInt(1), irInt(2)];

      const result = lib.emit(
        "add",
        args,
        [Types.int, Types.int],
        createTestContext(),
      );
      assert.strictEqual(result, "1 + 2");
    });

    it("should use fallback for unregistered function", () => {
      const lib = new StdLib<string>();
      lib.registerFallback((name, args, _argTypes, ctx) => {
        const emittedArgs = args.map((a) => ctx.emit(a)).join(", ");
        return `fallback.${name}(${emittedArgs})`;
      });

      const args: IRExpr[] = [irInt(42)];

      const result = lib.emit(
        "unknown",
        args,
        [Types.int],
        createTestContext(),
      );
      assert.strictEqual(result, "fallback.unknown(42)");
    });

    it("should throw when no implementation and no fallback", () => {
      const lib = new StdLib<string>();

      const args: IRExpr[] = [irInt(1)];

      assert.throws(
        () => lib.emit("unknown", args, [Types.int], createTestContext()),
        /Unknown function unknown\(Int\)/,
      );
    });

    it("should prefer specific implementation over fallback", () => {
      const lib = new StdLib<string>();
      lib.register("add", [Types.int, Types.int], () => "specific");
      lib.registerFallback(() => "fallback");

      const args: IRExpr[] = [irInt(1), irInt(2)];

      const result = lib.emit(
        "add",
        args,
        [Types.int, Types.int],
        createTestContext(),
      );
      assert.strictEqual(result, "specific");
    });
  });

  describe("registerFallback", () => {
    it("should support chained fallback registration", () => {
      const lib = new StdLib<string>()
        .register("add", [Types.int, Types.int], () => "add")
        .registerFallback(() => "fallback");

      const args: IRExpr[] = [irInt(1)];

      const result = lib.emit(
        "unknown",
        args,
        [Types.int],
        createTestContext(),
      );
      assert.strictEqual(result, "fallback");
    });

    it("should receive correct arguments in fallback", () => {
      const lib = new StdLib<string>();
      let capturedName: string | undefined;
      let capturedArgTypes: unknown[] | undefined;

      lib.registerFallback((name, _args, argTypes, _ctx) => {
        capturedName = name;
        capturedArgTypes = argTypes;
        return "captured";
      });

      const args: IRExpr[] = [irInt(1), irFloat(2.5)];

      lib.emit("test", args, [Types.int, Types.float], createTestContext());

      assert.strictEqual(capturedName, "test");
      assert.deepStrictEqual(capturedArgTypes, [Types.int, Types.float]);
    });
  });
});

describe("simpleBinaryOp", () => {
  it("should create emitter for addition", () => {
    const emitter = simpleBinaryOp("+");
    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: (ir: IRExpr) =>
        (ir as { value: number }).value.toString(),
    };

    const args: IRExpr[] = [irInt(1), irInt(2)];

    assert.strictEqual(emitter(args, ctx), "1 + 2");
  });

  it("should work with different operators", () => {
    const ops = [
      "+",
      "-",
      "*",
      "/",
      "%",
      "&&",
      "||",
      "<",
      ">",
      "<=",
      ">=",
      "==",
      "!=",
    ];
    const args: IRExpr[] = [irInt(1), irInt(2)];

    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: (ir: IRExpr) =>
        (ir as { value: number }).value.toString(),
    };

    for (const op of ops) {
      const emitter = simpleBinaryOp(op);
      assert.strictEqual(emitter(args, ctx), `1 ${op} 2`);
    }
  });
});

describe("binaryOp", () => {
  it("should create custom binary operator", () => {
    const emitter = binaryOp<string>(
      "+",
      (left, right) => `ADD(${left}, ${right})`,
    );
    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: (ir: IRExpr) =>
        (ir as { value: number }).value.toString(),
    };

    const args: IRExpr[] = [irInt(1), irInt(2)];

    assert.strictEqual(emitter(args, ctx), "ADD(1, 2)");
  });

  it("should use emitWithParens for both sides", () => {
    let leftOp: string | undefined;
    let leftSide: string | undefined;
    let rightOp: string | undefined;
    let rightSide: string | undefined;

    const emitter = binaryOp<string>(
      "+",
      (left, right) => `${left} + ${right}`,
    );
    const ctx = {
      emit: () => "direct",
      emitWithParens: (ir: IRExpr, op: string, side: "left" | "right") => {
        if (side === "left") {
          leftOp = op;
          leftSide = side;
        } else {
          rightOp = op;
          rightSide = side;
        }
        return (ir as { value: number }).value.toString();
      },
    };

    const args: IRExpr[] = [irInt(1), irInt(2)];

    emitter(args, ctx);

    assert.strictEqual(leftOp, "+");
    assert.strictEqual(leftSide, "left");
    assert.strictEqual(rightOp, "+");
    assert.strictEqual(rightSide, "right");
  });
});

describe("unaryOp", () => {
  it("should create unary operator without parens", () => {
    const emitter = unaryOp<string>(
      (operand, needsParens) => (needsParens ? `-(${operand})` : `-${operand}`),
      () => false,
    );

    const ctx = {
      emit: (ir: IRExpr) => (ir as { name: string }).name,
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irVariable("x")];

    assert.strictEqual(emitter(args, ctx), "-x");
  });

  it("should create unary operator with parens when needed", () => {
    const emitter = unaryOp<string>(
      (operand, needsParens) => (needsParens ? `-(${operand})` : `-${operand}`),
      () => true,
    );

    const ctx = {
      emit: () => "1 + 2",
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irInt(0)];

    assert.strictEqual(emitter(args, ctx), "-(1 + 2)");
  });
});

describe("methodCall", () => {
  it("should create method call with one argument", () => {
    const emitter = methodCall("add");
    const ctx = {
      emit: (ir: IRExpr) => {
        if (ir.type === "variable") return ir.name;
        return "duration";
      },
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irVariable("date", Types.date), irDuration("P1D")];

    assert.strictEqual(emitter(args, ctx), "date.add(duration)");
  });
});

describe("nullary", () => {
  it("should return constant value", () => {
    const emitter = nullary("CURRENT_DATE");
    const ctx = {
      emit: () => "",
      emitWithParens: () => "",
    };

    assert.strictEqual(emitter([], ctx), "CURRENT_DATE");
  });

  it("should work with different types", () => {
    const stringEmitter = nullary("DateTime.now().startOf('day')");
    const numberEmitter = nullary(42);

    const stringCtx: EmitContext<string> = {
      emit: () => "",
      emitWithParens: () => "",
    };

    const numberCtx: EmitContext<number> = {
      emit: () => 0,
      emitWithParens: () => 0,
    };

    assert.strictEqual(
      stringEmitter([], stringCtx),
      "DateTime.now().startOf('day')",
    );
    assert.strictEqual(numberEmitter([], numberCtx), 42);
  });
});

describe("unaryMethod", () => {
  it("should create method call without arguments", () => {
    const emitter = unaryMethod("beginning_of_day");
    const ctx = {
      emit: (ir: IRExpr) => (ir as { name: string }).name,
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irVariable("date", Types.date)];

    assert.strictEqual(emitter(args, ctx), "date.beginning_of_day");
  });
});

describe("fnCall", () => {
  it("should create function call with no arguments", () => {
    const emitter = fnCall("NOW");
    const ctx = {
      emit: () => "",
      emitWithParens: () => "",
    };

    assert.strictEqual(emitter([], ctx), "NOW()");
  });

  it("should create function call with one argument", () => {
    const emitter = fnCall("ABS");
    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irInt(-5)];

    assert.strictEqual(emitter(args, ctx), "ABS(-5)");
  });

  it("should create function call with multiple arguments", () => {
    const emitter = fnCall("POWER");
    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irInt(2), irInt(3)];

    assert.strictEqual(emitter(args, ctx), "POWER(2, 3)");
  });

  it("should work with Math.pow style function names", () => {
    const emitter = fnCall("Math.pow");
    const ctx = {
      emit: (ir: IRExpr) => (ir as { value: number }).value.toString(),
      emitWithParens: () => "",
    };

    const args: IRExpr[] = [irInt(2), irInt(8)];

    assert.strictEqual(emitter(args, ctx), "Math.pow(2, 8)");
  });
});
