import { describe, it } from "bun:test";
import assert from "node:assert";
import { parseCSV, toCSV } from "../../src/csv";

describe("parseCSV - basic parsing", () => {
  it("parses simple CSV with headers", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("parses empty CSV", () => {
    const result = parseCSV("");
    assert.deepStrictEqual(result, []);
  });

  it("parses CSV with only headers", () => {
    const result = parseCSV("name,age");
    assert.deepStrictEqual(result, []);
  });

  it("parses single row", () => {
    const csv = "name,age\nAlice,30";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ name: "Alice", age: "30" }]);
  });

  it("handles Windows line endings (CRLF)", () => {
    const csv = "name,age\r\nAlice,30\r\nBob,25";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("handles trailing newline", () => {
    const csv = "name,age\nAlice,30\n";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ name: "Alice", age: "30" }]);
  });
});

describe("parseCSV - quoted values", () => {
  it("parses quoted values", () => {
    const csv = 'name,bio\nAlice,"Hello, world"';
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ name: "Alice", bio: "Hello, world" }]);
  });

  it("handles escaped quotes in quoted values", () => {
    const csv = 'name,quote\nAlice,"She said ""hello"""';
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [
      { name: "Alice", quote: 'She said "hello"' },
    ]);
  });

  it("handles newlines in quoted values", () => {
    const csv = 'name,address\nAlice,"123 Main St\nApt 4"';
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [
      { name: "Alice", address: "123 Main St\nApt 4" },
    ]);
  });
});

describe("parseCSV - edge cases", () => {
  it("handles empty values", () => {
    const csv = "a,b,c\n1,,3";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ a: "1", b: "", c: "3" }]);
  });

  it("handles fewer values than headers", () => {
    const csv = "a,b,c\n1,2";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ a: "1", b: "2", c: "" }]);
  });

  it("keeps all values as strings", () => {
    const csv = "num,bool,val\n123,true,null";
    const result = parseCSV(csv);
    assert.deepStrictEqual(result, [{ num: "123", bool: "true", val: "null" }]);
  });
});

describe("toCSV - array of objects", () => {
  it("serializes array of objects", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = toCSV(data);
    assert.strictEqual(result, "name,age\nAlice,30\nBob,25");
  });

  it("serializes empty array", () => {
    const result = toCSV([]);
    assert.strictEqual(result, "");
  });

  it("serializes single object in array", () => {
    const data = [{ name: "Alice", age: 30 }];
    const result = toCSV(data);
    assert.strictEqual(result, "name,age\nAlice,30");
  });
});

describe("toCSV - single object", () => {
  it("serializes single object as single-row CSV", () => {
    const data = { name: "Alice", age: 30 };
    const result = toCSV(data);
    assert.strictEqual(result, "name,age\nAlice,30");
  });
});

describe("toCSV - escaping", () => {
  it("escapes values containing commas", () => {
    const data = [{ name: "Alice", bio: "Hello, world" }];
    const result = toCSV(data);
    assert.strictEqual(result, 'name,bio\nAlice,"Hello, world"');
  });

  it("escapes values containing quotes", () => {
    const data = [{ name: "Alice", quote: 'She said "hello"' }];
    const result = toCSV(data);
    assert.strictEqual(result, 'name,quote\nAlice,"She said ""hello"""');
  });

  it("escapes values containing newlines", () => {
    const data = [{ name: "Alice", address: "123 Main St\nApt 4" }];
    const result = toCSV(data);
    assert.strictEqual(result, 'name,address\nAlice,"123 Main St\nApt 4"');
  });

  it("escapes headers if needed", () => {
    const data = [{ "first,name": "Alice" }];
    const result = toCSV(data);
    assert.strictEqual(result, '"first,name"\nAlice');
  });
});

describe("toCSV - type conversion", () => {
  it("converts all values to strings", () => {
    const data = [{ num: 42, bool: true, nil: null, str: "hello" }];
    const result = toCSV(data);
    assert.strictEqual(result, "num,bool,nil,str\n42,true,,hello");
  });

  it("handles undefined as empty string", () => {
    const data = [{ a: 1, b: undefined }];
    const result = toCSV(data);
    assert.strictEqual(result, "a,b\n1,");
  });
});

describe("toCSV - error cases", () => {
  it("throws for array of non-objects", () => {
    assert.throws(() => toCSV([1, 2, 3]), /array of objects/);
  });

  it("throws for array with mixed types", () => {
    assert.throws(
      () => toCSV([{ a: 1 }, "string"]),
      /all elements to be objects/,
    );
  });

  it("throws for primitive value", () => {
    assert.throws(() => toCSV("hello"), /object or array of objects/);
  });

  it("throws for null", () => {
    assert.throws(() => toCSV(null), /object or array of objects/);
  });

  it("throws for nested arrays", () => {
    assert.throws(
      () =>
        toCSV([
          [1, 2],
          [3, 4],
        ]),
      /array of objects/,
    );
  });
});

describe("parseCSV/toCSV - round-trip", () => {
  it("round-trips simple data", () => {
    const original = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const csv = toCSV(original);
    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, original);
  });

  it("round-trips data with special characters", () => {
    const original = [{ name: "Alice", bio: 'Hello, "world"' }];
    const csv = toCSV(original);
    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, original);
  });
});
