import { describe, it } from "bun:test";
import assert from "node:assert";
import {
  jsonAdapter,
  csvAdapter,
  eloAdapter,
  defaultFormats,
  getFormat,
  FormatAdapter,
} from "../../src/formats";

describe("jsonAdapter", () => {
  it("parses JSON string to value", () => {
    assert.deepStrictEqual(jsonAdapter.parse('{"a": 1}'), { a: 1 });
    assert.deepStrictEqual(jsonAdapter.parse("[1, 2, 3]"), [1, 2, 3]);
    assert.strictEqual(jsonAdapter.parse("42"), 42);
    assert.strictEqual(jsonAdapter.parse('"hello"'), "hello");
  });

  it("serializes value to JSON string", () => {
    assert.strictEqual(jsonAdapter.serialize({ a: 1 }), '{"a":1}');
    assert.strictEqual(jsonAdapter.serialize([1, 2, 3]), "[1,2,3]");
    assert.strictEqual(jsonAdapter.serialize(42), "42");
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => jsonAdapter.parse("not json"));
  });
});

describe("csvAdapter", () => {
  it("parses CSV to array of objects", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    assert.deepStrictEqual(csvAdapter.parse(csv), [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("serializes array of objects to CSV", () => {
    const data = [{ name: "Alice", age: 30 }];
    assert.strictEqual(csvAdapter.serialize(data), "name,age\nAlice,30");
  });

  it("throws on non-object arrays", () => {
    assert.throws(() => csvAdapter.serialize([1, 2, 3]));
  });
});

describe("eloAdapter", () => {
  it("serializes values to Elo code", () => {
    assert.strictEqual(
      eloAdapter.serialize({ a: 1, b: "hello" }),
      "{a: 1, b: 'hello'}",
    );
    assert.strictEqual(eloAdapter.serialize([1, 2, 3]), "[1, 2, 3]");
    assert.strictEqual(eloAdapter.serialize(null), "null");
  });

  it("throws on parse (output-only format)", () => {
    assert.throws(() => eloAdapter.parse("1 + 2"), /output-only/);
  });
});

describe("defaultFormats", () => {
  it("contains json, csv, and elo adapters", () => {
    assert.ok(defaultFormats.json);
    assert.ok(defaultFormats.csv);
    assert.ok(defaultFormats.elo);
  });
});

describe("getFormat", () => {
  it("returns adapter for known format", () => {
    assert.strictEqual(getFormat(defaultFormats, "json"), jsonAdapter);
    assert.strictEqual(getFormat(defaultFormats, "csv"), csvAdapter);
    assert.strictEqual(getFormat(defaultFormats, "elo"), eloAdapter);
  });

  it("throws for unknown format", () => {
    assert.throws(
      () => getFormat(defaultFormats, "xlsx"),
      /Unknown format 'xlsx'/,
    );
  });

  it("works with custom formats", () => {
    const customAdapter: FormatAdapter = {
      parse: (s) => s.split("|"),
      serialize: (v) => (v as string[]).join("|"),
    };
    const formats = { ...defaultFormats, pipe: customAdapter };

    assert.deepStrictEqual(getFormat(formats, "pipe").parse("a|b|c"), [
      "a",
      "b",
      "c",
    ]);
    assert.strictEqual(getFormat(formats, "pipe").serialize(["x", "y"]), "x|y");
  });
});
