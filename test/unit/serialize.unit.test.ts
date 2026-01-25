import { describe, it } from "bun:test";
import assert from "node:assert";
import { toEloCode } from "../../src/serialize";
import { DateTime, Duration } from "luxon";

describe("toEloCode - primitives", () => {
  it("serializes null", () => {
    assert.strictEqual(toEloCode(null), "null");
  });

  it("serializes undefined as null", () => {
    assert.strictEqual(toEloCode(undefined), "null");
  });

  it("serializes true", () => {
    assert.strictEqual(toEloCode(true), "true");
  });

  it("serializes false", () => {
    assert.strictEqual(toEloCode(false), "false");
  });

  it("serializes integers", () => {
    assert.strictEqual(toEloCode(42), "42");
    assert.strictEqual(toEloCode(0), "0");
    assert.strictEqual(toEloCode(-123), "-123");
  });

  it("serializes floats", () => {
    assert.strictEqual(toEloCode(3.14), "3.14");
    assert.strictEqual(toEloCode(-0.5), "-0.5");
  });

  it("serializes Infinity as null", () => {
    assert.strictEqual(toEloCode(Infinity), "null");
    assert.strictEqual(toEloCode(-Infinity), "null");
  });

  it("serializes NaN as null", () => {
    assert.strictEqual(toEloCode(NaN), "null");
  });
});

describe("toEloCode - strings", () => {
  it("serializes simple strings", () => {
    assert.strictEqual(toEloCode("hello"), "'hello'");
  });

  it("serializes empty string", () => {
    assert.strictEqual(toEloCode(""), "''");
  });

  it("escapes single quotes", () => {
    assert.strictEqual(toEloCode("it's"), "'it\\'s'");
  });

  it("escapes backslashes", () => {
    assert.strictEqual(toEloCode("a\\b"), "'a\\\\b'");
  });

  it("escapes both quotes and backslashes", () => {
    assert.strictEqual(toEloCode("it\\'s"), "'it\\\\\\'s'");
  });

  it("preserves other special characters", () => {
    assert.strictEqual(toEloCode("hello\nworld"), "'hello\nworld'");
    assert.strictEqual(toEloCode("tab\there"), "'tab\there'");
  });
});

describe("toEloCode - DateTime", () => {
  it("serializes date-only DateTime as date literal", () => {
    const d = DateTime.fromISO("2024-01-15");
    assert.strictEqual(toEloCode(d), "D2024-01-15");
  });

  it("serializes DateTime with time as datetime literal", () => {
    const dt = DateTime.fromISO("2024-01-15T10:30:00Z");
    const result = toEloCode(dt);
    assert.ok(
      result.startsWith("D2024-01-15T"),
      `Expected datetime format, got: ${result}`,
    );
  });

  it("serializes DateTime with milliseconds", () => {
    const dt = DateTime.fromISO("2024-01-15T10:30:00.123Z");
    const result = toEloCode(dt);
    assert.ok(result.includes("123"), `Expected milliseconds, got: ${result}`);
  });

  it("serializes invalid DateTime as null", () => {
    const invalid = DateTime.invalid("test");
    assert.strictEqual(toEloCode(invalid), "null");
  });
});

describe("toEloCode - Duration", () => {
  it("serializes simple duration", () => {
    const d = Duration.fromISO("P1D");
    assert.strictEqual(toEloCode(d), "P1D");
  });

  it("serializes time duration", () => {
    const d = Duration.fromISO("PT1H30M");
    assert.strictEqual(toEloCode(d), "PT1H30M");
  });

  it("serializes complex duration", () => {
    const d = Duration.fromISO("P1DT2H30M");
    assert.strictEqual(toEloCode(d), "P1DT2H30M");
  });

  it("serializes invalid Duration as null", () => {
    const invalid = Duration.invalid("test");
    assert.strictEqual(toEloCode(invalid), "null");
  });
});

describe("toEloCode - arrays", () => {
  it("serializes empty array", () => {
    assert.strictEqual(toEloCode([]), "[]");
  });

  it("serializes array of numbers", () => {
    assert.strictEqual(toEloCode([1, 2, 3]), "[1, 2, 3]");
  });

  it("serializes mixed array", () => {
    assert.strictEqual(toEloCode([1, "hello", true]), "[1, 'hello', true]");
  });

  it("serializes nested arrays", () => {
    assert.strictEqual(
      toEloCode([
        [1, 2],
        [3, 4],
      ]),
      "[[1, 2], [3, 4]]",
    );
  });

  it("serializes array with null", () => {
    assert.strictEqual(toEloCode([1, null, 3]), "[1, null, 3]");
  });
});

describe("toEloCode - objects", () => {
  it("serializes empty object", () => {
    assert.strictEqual(toEloCode({}), "{}");
  });

  it("serializes simple object", () => {
    assert.strictEqual(toEloCode({ name: "Alice" }), "{name: 'Alice'}");
  });

  it("serializes object with multiple properties", () => {
    const result = toEloCode({ name: "Bob", age: 30 });
    // Object property order may vary, so check structure
    assert.ok(
      result.includes("name: 'Bob'"),
      `Expected name property, got: ${result}`,
    );
    assert.ok(
      result.includes("age: 30"),
      `Expected age property, got: ${result}`,
    );
  });

  it("serializes nested objects", () => {
    const result = toEloCode({ person: { name: "Alice" } });
    assert.strictEqual(result, "{person: {name: 'Alice'}}");
  });

  it("serializes object with array value", () => {
    assert.strictEqual(toEloCode({ items: [1, 2] }), "{items: [1, 2]}");
  });

  it("quotes keys that are not valid identifiers", () => {
    assert.strictEqual(toEloCode({ "my-key": 1 }), "{'my-key': 1}");
    assert.strictEqual(toEloCode({ "123": 1 }), "{'123': 1}");
    assert.strictEqual(toEloCode({ "with space": 1 }), "{'with space': 1}");
  });

  it("escapes quotes in quoted keys", () => {
    assert.strictEqual(toEloCode({ "it's": 1 }), "{'it\\'s': 1}");
  });
});

describe("toEloCode - functions", () => {
  it("serializes functions as <function>", () => {
    assert.strictEqual(
      toEloCode(() => 1),
      "<function>",
    );
    assert.strictEqual(
      toEloCode(function test() {
        return 1;
      }),
      "<function>",
    );
  });
});

describe("toEloCode - complex nested structures", () => {
  it("serializes complex data", () => {
    const data = {
      users: [
        { name: "Alice", active: true },
        { name: "Bob", active: false },
      ],
      count: 2,
    };
    const result = toEloCode(data);
    assert.ok(result.includes("users:"), result);
    assert.ok(result.includes("name: 'Alice'"), result);
    assert.ok(result.includes("active: true"), result);
    assert.ok(result.includes("count: 2"), result);
  });
});
