import { describe, it } from "bun:test";
import assert from "node:assert";
import {
  Types,
  typeEquals,
  isNumeric,
  isTemporal,
  isKnown,
  typeName,
} from "../../src/types";

describe("Types constants", () => {
  it("should have all expected type kinds", () => {
    assert.strictEqual(Types.int.kind, "int");
    assert.strictEqual(Types.float.kind, "float");
    assert.strictEqual(Types.bool.kind, "bool");
    assert.strictEqual(Types.string.kind, "string");
    assert.strictEqual(Types.date.kind, "date");
    assert.strictEqual(Types.datetime.kind, "datetime");
    assert.strictEqual(Types.duration.kind, "duration");
    assert.strictEqual(Types.any.kind, "any");
  });
});

describe("typeEquals", () => {
  it("should return true for same types", () => {
    assert.strictEqual(typeEquals(Types.int, Types.int), true);
    assert.strictEqual(typeEquals(Types.float, Types.float), true);
    assert.strictEqual(typeEquals(Types.bool, Types.bool), true);
    assert.strictEqual(typeEquals(Types.string, Types.string), true);
    assert.strictEqual(typeEquals(Types.date, Types.date), true);
    assert.strictEqual(typeEquals(Types.datetime, Types.datetime), true);
    assert.strictEqual(typeEquals(Types.duration, Types.duration), true);
    assert.strictEqual(typeEquals(Types.any, Types.any), true);
  });

  it("should return false for different types", () => {
    assert.strictEqual(typeEquals(Types.int, Types.float), false);
    assert.strictEqual(typeEquals(Types.bool, Types.string), false);
    assert.strictEqual(typeEquals(Types.date, Types.datetime), false);
    assert.strictEqual(typeEquals(Types.int, Types.any), false);
  });

  it("should work with equivalent type objects", () => {
    const int1 = { kind: "int" as const };
    const int2 = { kind: "int" as const };
    assert.strictEqual(typeEquals(int1, int2), true);
  });
});

describe("isNumeric", () => {
  it("should return true for int", () => {
    assert.strictEqual(isNumeric(Types.int), true);
  });

  it("should return true for float", () => {
    assert.strictEqual(isNumeric(Types.float), true);
  });

  it("should return false for non-numeric types", () => {
    assert.strictEqual(isNumeric(Types.bool), false);
    assert.strictEqual(isNumeric(Types.string), false);
    assert.strictEqual(isNumeric(Types.date), false);
    assert.strictEqual(isNumeric(Types.datetime), false);
    assert.strictEqual(isNumeric(Types.duration), false);
    assert.strictEqual(isNumeric(Types.any), false);
  });
});

describe("isTemporal", () => {
  it("should return true for date", () => {
    assert.strictEqual(isTemporal(Types.date), true);
  });

  it("should return true for datetime", () => {
    assert.strictEqual(isTemporal(Types.datetime), true);
  });

  it("should return true for duration", () => {
    assert.strictEqual(isTemporal(Types.duration), true);
  });

  it("should return false for non-temporal types", () => {
    assert.strictEqual(isTemporal(Types.int), false);
    assert.strictEqual(isTemporal(Types.float), false);
    assert.strictEqual(isTemporal(Types.bool), false);
    assert.strictEqual(isTemporal(Types.string), false);
    assert.strictEqual(isTemporal(Types.any), false);
  });
});

describe("isKnown", () => {
  it("should return true for all concrete types", () => {
    assert.strictEqual(isKnown(Types.int), true);
    assert.strictEqual(isKnown(Types.float), true);
    assert.strictEqual(isKnown(Types.bool), true);
    assert.strictEqual(isKnown(Types.string), true);
    assert.strictEqual(isKnown(Types.date), true);
    assert.strictEqual(isKnown(Types.datetime), true);
    assert.strictEqual(isKnown(Types.duration), true);
  });

  it("should return false for any", () => {
    assert.strictEqual(isKnown(Types.any), false);
  });
});

describe("typeName", () => {
  it("should return the kind string for each type", () => {
    assert.strictEqual(typeName(Types.int), "int");
    assert.strictEqual(typeName(Types.float), "float");
    assert.strictEqual(typeName(Types.bool), "bool");
    assert.strictEqual(typeName(Types.string), "string");
    assert.strictEqual(typeName(Types.date), "date");
    assert.strictEqual(typeName(Types.datetime), "datetime");
    assert.strictEqual(typeName(Types.duration), "duration");
    assert.strictEqual(typeName(Types.any), "any");
  });
});
