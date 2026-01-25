import { describe, it } from "bun:test";
import assert from "node:assert";
import { literal, variable, binary, unary } from "../../src/ast";

describe("AST - literal() helper", () => {
  it("should create numeric literal", () => {
    const node = literal(42);
    assert.deepStrictEqual(node, {
      type: "literal",
      value: 42,
    });
  });

  it("should create floating point literal", () => {
    const node = literal(3.14);
    assert.deepStrictEqual(node, {
      type: "literal",
      value: 3.14,
    });
  });

  it("should create boolean true literal", () => {
    const node = literal(true);
    assert.deepStrictEqual(node, {
      type: "literal",
      value: true,
    });
  });

  it("should create boolean false literal", () => {
    const node = literal(false);
    assert.deepStrictEqual(node, {
      type: "literal",
      value: false,
    });
  });

  it("should create zero literal", () => {
    const node = literal(0);
    assert.deepStrictEqual(node, {
      type: "literal",
      value: 0,
    });
  });
});

describe("AST - variable() helper", () => {
  it("should create variable node", () => {
    const node = variable("x");
    assert.deepStrictEqual(node, {
      type: "variable",
      name: "x",
    });
  });

  it("should handle multi-character names", () => {
    const node = variable("price");
    assert.deepStrictEqual(node, {
      type: "variable",
      name: "price",
    });
  });

  it("should handle underscores", () => {
    const node = variable("user_name");
    assert.deepStrictEqual(node, {
      type: "variable",
      name: "user_name",
    });
  });
});

describe("AST - binary() helper", () => {
  it("should create addition node", () => {
    const node = binary("+", literal(1), literal(2));
    assert.strictEqual(node.type, "binary");
    assert.strictEqual(node.operator, "+");
    assert.deepStrictEqual(node.left, { type: "literal", value: 1 });
    assert.deepStrictEqual(node.right, { type: "literal", value: 2 });
  });

  it("should create subtraction node", () => {
    const node = binary("-", literal(5), literal(3));
    assert.strictEqual(node.operator, "-");
  });

  it("should create multiplication node", () => {
    const node = binary("*", literal(4), literal(3));
    assert.strictEqual(node.operator, "*");
  });

  it("should create division node", () => {
    const node = binary("/", literal(10), literal(2));
    assert.strictEqual(node.operator, "/");
  });

  it("should create modulo node", () => {
    const node = binary("%", literal(10), literal(3));
    assert.strictEqual(node.operator, "%");
  });

  it("should create power node", () => {
    const node = binary("^", literal(2), literal(3));
    assert.strictEqual(node.operator, "^");
  });

  it("should create less than node", () => {
    const node = binary("<", variable("x"), literal(10));
    assert.strictEqual(node.operator, "<");
  });

  it("should create greater than node", () => {
    const node = binary(">", variable("x"), literal(10));
    assert.strictEqual(node.operator, ">");
  });

  it("should create less than or equal node", () => {
    const node = binary("<=", variable("x"), literal(10));
    assert.strictEqual(node.operator, "<=");
  });

  it("should create greater than or equal node", () => {
    const node = binary(">=", variable("x"), literal(10));
    assert.strictEqual(node.operator, ">=");
  });

  it("should create equality node", () => {
    const node = binary("==", variable("x"), literal(10));
    assert.strictEqual(node.operator, "==");
  });

  it("should create inequality node", () => {
    const node = binary("!=", variable("x"), literal(10));
    assert.strictEqual(node.operator, "!=");
  });

  it("should create AND node", () => {
    const node = binary("&&", literal(true), literal(false));
    assert.strictEqual(node.operator, "&&");
  });

  it("should create OR node", () => {
    const node = binary("||", literal(true), literal(false));
    assert.strictEqual(node.operator, "||");
  });

  it("should allow nested binary operations", () => {
    const inner = binary("+", literal(1), literal(2));
    const outer = binary("*", inner, literal(3));
    assert.strictEqual(outer.type, "binary");
    assert.strictEqual(outer.operator, "*");
    assert.strictEqual(outer.left.type, "binary");
  });
});

describe("AST - unary() helper", () => {
  it("should create unary minus node", () => {
    const node = unary("-", literal(5));
    assert.strictEqual(node.type, "unary");
    assert.strictEqual(node.operator, "-");
    assert.deepStrictEqual(node.operand, { type: "literal", value: 5 });
  });

  it("should create unary plus node", () => {
    const node = unary("+", literal(5));
    assert.strictEqual(node.operator, "+");
  });

  it("should create NOT node", () => {
    const node = unary("!", variable("active"));
    assert.strictEqual(node.operator, "!");
    assert.deepStrictEqual(node.operand, { type: "variable", name: "active" });
  });

  it("should allow nested unary operations", () => {
    const inner = unary("-", literal(5));
    const outer = unary("-", inner);
    assert.strictEqual(outer.type, "unary");
    assert.strictEqual(outer.operand.type, "unary");
  });
});

describe("AST - Complex tree construction", () => {
  it("should build (a + b) * c", () => {
    const tree = binary(
      "*",
      binary("+", variable("a"), variable("b")),
      variable("c"),
    );
    assert.strictEqual(tree.type, "binary");
    assert.strictEqual(tree.operator, "*");
    assert.strictEqual(tree.left.type, "binary");
  });

  it("should build !(x > 10)", () => {
    const tree = unary("!", binary(">", variable("x"), literal(10)));
    assert.strictEqual(tree.type, "unary");
    assert.strictEqual(tree.operator, "!");
    assert.strictEqual(tree.operand.type, "binary");
  });

  it("should build complex boolean expression", () => {
    const tree = binary(
      "&&",
      binary(">", variable("x"), literal(0)),
      binary("<", variable("x"), literal(100)),
    );
    assert.strictEqual(tree.type, "binary");
    assert.strictEqual(tree.operator, "&&");
    assert.strictEqual(tree.left.type, "binary");
    assert.strictEqual(tree.right.type, "binary");
  });
});
