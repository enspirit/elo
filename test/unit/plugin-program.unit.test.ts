import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import {
  parsePluginProgram,
  compilePlugin,
  parseWithMeta,
} from "../../src/index";

describe("Plugin program parsing", () => {
  it("parses plan/then rounds and score expression", () => {
    const src = "plan a = 1, b = _.x in then c = 2 in a + b + c";
    const program = parsePluginProgram(src);
    assert.strictEqual(program.rounds.length, 2);
    assert.deepStrictEqual(
      program.rounds.map((r) => r.kind),
      ["plan", "then"],
    );
    assert.deepStrictEqual(
      program.rounds[0].bindings.map((b) => b.name),
      ["a", "b"],
    );
    assert.deepStrictEqual(
      program.rounds[1].bindings.map((b) => b.name),
      ["c"],
    );
    assert.strictEqual(program.score.type, "binary");
  });

  it("parses do calls inside round bindings", () => {
    const src = "plan x = do 'nostr.query' {kinds: [0]} in x | null";
    const program = parsePluginProgram(src);
    const x = program.rounds[0].bindings[0].value;
    assert.strictEqual(x.type, "do_call");
    if (x.type === "do_call") {
      assert.strictEqual(x.capName, "nostr.query");
      assert.strictEqual(x.argsExpr.type, "object");
    }
  });
});

describe("Plugin program compilation", () => {
  it("rejects do calls in score expression", () => {
    const src = "plan x = 1 in do 'nostr.query' {kinds: [0]}";
    assert.throws(() => compilePlugin(src), /do/i);
  });
});

describe("parseWithMeta", () => {
  it("returns diagnostics with best-effort line/column", () => {
    const res = parseWithMeta("2 + +");
    assert.strictEqual(res.ast, null);
    assert.ok(res.diagnostics.length >= 1);
    assert.strictEqual(res.diagnostics[0].severity, "error");
  });
});
