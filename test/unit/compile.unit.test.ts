import { describe, it } from "bun:test";
import assert from "node:assert";
import { compile } from "../../src/compile";
import { DateTime, Duration } from "luxon";

const runtime = { DateTime, Duration };

describe("compile - expressions using _", () => {
  it("compiles simple arithmetic on input", () => {
    const addTen = compile<(x: number) => number>("_ + 10", { runtime });
    assert.strictEqual(addTen(5), 15);
  });

  it("compiles conditional on input", () => {
    const fn = compile<(x: number) => number>("if _ > 0 then _ else 0 - _", {
      runtime,
    });
    assert.strictEqual(fn(5), 5);
    assert.strictEqual(fn(-5), 5);
  });
});

describe("compile - lambdas (called via null input)", () => {
  it("compiles identity lambda", () => {
    const fn = compile<(_: null) => (x: number) => number>("fn(x ~> x)", {
      runtime,
    })(null);
    assert.strictEqual(fn(42), 42);
  });

  it("compiles arithmetic lambda", () => {
    const fn = compile<(_: null) => (x: number) => number>("fn(x ~> x * 2)", {
      runtime,
    })(null);
    assert.strictEqual(fn(21), 42);
  });

  it("compiles multi-parameter lambda", () => {
    const fn = compile<(_: null) => (x: number, y: number) => number>(
      "fn(x, y ~> x + y)",
      { runtime },
    )(null);
    assert.strictEqual(fn(10, 32), 42);
  });

  it("compiles lambda with let binding", () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> let doubled = x * 2 in doubled + 1)",
      { runtime },
    )(null);
    assert.strictEqual(fn(5), 11);
  });

  it("compiles lambda with conditional", () => {
    const fn = compile<(_: null) => (x: number) => number>(
      "fn(x ~> if x > 0 then x else 0 - x)",
      { runtime },
    )(null);
    assert.strictEqual(fn(5), 5);
    assert.strictEqual(fn(-5), 5);
  });
});

describe("compile - temporal expressions using _", () => {
  it("compiles date in range check", () => {
    const inThisWeek = compile<(d: unknown) => boolean>("_ in SOW ... EOW", {
      runtime,
    });
    // The function should be callable and return a boolean
    const result = inThisWeek(DateTime.now());
    assert.strictEqual(typeof result, "boolean");
  });

  it("compiles date comparison", () => {
    const fn = compile<(d: unknown) => boolean>("_ >= TODAY", { runtime });
    const tomorrow = DateTime.now().plus({ days: 1 });
    assert.strictEqual(fn(tomorrow), true);
    const yesterday = DateTime.now().minus({ days: 1 });
    assert.strictEqual(fn(yesterday), false);
  });
});

describe("compile - boolean expressions using _", () => {
  it("compiles boolean comparison on input", () => {
    const fn = compile<(x: number) => boolean>("_ > 10", { runtime });
    assert.strictEqual(fn(5), false);
    assert.strictEqual(fn(15), true);
  });
});
