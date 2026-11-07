import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  ALLOWED_GLOBALS,
  ALLOWED_PROPERTIES,
  checkEmittedJavaScript,
  describeViolations,
  isStaticallyNumericIndex,
} from '../support/emitted-js-grammar';
import * as ts from 'typescript';

/**
 * Every emitted JavaScript in the corpus stays inside the allowed grammar.
 *
 * See `test/support/emitted-js-grammar.ts` for what the grammar is and why it
 * is the shape of the security property rather than a style rule.
 *
 * This file checks the committed `.expected.js`, which is the default
 * compilation. The `--optimize` emission — a *different* emitter choice, and
 * the one the typed `at()` sandbox escape lived in — is checked by
 * `test/integration/emitted-grammar.integration.test.ts`.
 */

const FIXTURES = join(__dirname, '../../../test/fixtures');

function findExpectedJs(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findExpectedJs(full));
    else if (entry.endsWith('.expected.js')) files.push(full);
  }
  return files.sort();
}

describe('The emitted JavaScript stays inside the allowed grammar', () => {
  const files = findExpectedJs(FIXTURES);

  it('finds the corpus', () => {
    assert.ok(files.length > 100, `only ${files.length} .expected.js files found`);
  });

  for (const path of files) {
    const name = relative(FIXTURES, path);
    it(name, () => {
      const lines = readFileSync(path, 'utf-8').split('\n');
      for (const [index, code] of lines.entries()) {
        if (!code.trim()) continue;
        const violations = checkEmittedJavaScript(code);
        assert.deepStrictEqual(
          violations,
          [],
          describeViolations(`${name}:${index + 1}`, code, violations)
        );
      }
    });
  }
});

/**
 * The gate itself, tested.
 *
 * A harness nobody has seen fail is a harness nobody knows works — and this
 * one is all negative space, so a bug in it is silent by construction. Each
 * case below is a real emission from a real fixed vulnerability.
 */
describe('The grammar gate catches what it is for', () => {
  const inProgram = (expression: string) => `(function(_) { return ${expression}; })(null);`;

  it('rejects the typed at() sandbox escape (1.2.3, under --optimize)', () => {
    // What `at(_.xs, _.i)` emitted before 45d71d0, with `--input-type`
    // promising Int: a declared type is not a runtime check, so `_.i` can be
    // the string 'constructor'.
    const violations = checkEmittedJavaScript(inProgram('(kMember(_, "xs")[kMember(_, "i")] ?? null)'));
    assert.ok(
      violations.some(v => v.rule === 'no-computed-member-access'),
      `expected a computed-access violation, got ${JSON.stringify(violations)}`
    );
  });

  it('rejects the dynamic at() sandbox escape (squ11z1)', () => {
    const violations = checkEmittedJavaScript(inProgram('(_["constructor"] ?? null)'));
    assert.ok(violations.some(v => v.rule === 'no-computed-member-access'));
  });

  it('rejects a reach for the Function constructor', () => {
    const violations = checkEmittedJavaScript(inProgram('Function("return 2+40")()'));
    assert.ok(violations.some(v => v.rule === 'no-unlisted-global'));
  });

  it('rejects a reach for process or require', () => {
    for (const payload of ['process.env', 'require("child_process")', 'globalThis']) {
      const violations = checkEmittedJavaScript(inProgram(payload));
      assert.ok(
        violations.some(v => v.rule === 'no-unlisted-global'),
        `${payload} was not caught: ${JSON.stringify(violations)}`
      );
    }
  });

  it('rejects a prototype-chain property read', () => {
    for (const payload of ['_.constructor', '_.__proto__', '_.toString.call(1)']) {
      const violations = checkEmittedJavaScript(inProgram(payload));
      assert.ok(
        violations.some(v => v.rule === 'no-unlisted-property'),
        `${payload} was not caught: ${JSON.stringify(violations)}`
      );
    }
  });

  it('rejects an emission that does not parse (the U+2028 extract bug)', () => {
    // What extract() emitted before 787f028: U+2028 is a line terminator
    // inside a regex literal, so the literal closed early.
    const violations = checkEmittedJavaScript(inProgram('"x".match(/a b(.*)$/)'));
    assert.deepStrictEqual(violations.map(v => v.rule), ['parses']);
  });

  it('rejects a write through a computed member (the kDeepMerge shape)', () => {
    const violations = checkEmittedJavaScript(inProgram('(function() { var r = {}; r["__proto__"] = 1; return r; })()'));
    assert.ok(violations.some(v => v.rule === 'no-assignment'));
    assert.ok(violations.some(v => v.rule === 'no-computed-member-access'));
  });

  it('accepts the two index shapes the compiler really emits', () => {
    assert.deepStrictEqual(checkEmittedJavaScript(inProgram('([1, 2, 3][0] ?? null)')), []);
    assert.deepStrictEqual(
      checkEmittedJavaScript(inProgram('(function() { var a = [1]; return a[a.length - 1]; })()')),
      []
    );
  });

  it('exempts the prelude helpers, which is where the guarded reads live', () => {
    const withHelper =
      '(function(_) { function kAt(a, i) { return a[i] ?? null; } return kAt([1], 0); })(null);';
    assert.deepStrictEqual(checkEmittedJavaScript(withHelper), []);
  });

  it('does not exempt a user lambda or an extract IIFE', () => {
    // An arrow function is a lambda the author wrote; it must obey the rules.
    const violations = checkEmittedJavaScript(inProgram('((x) => x["constructor"])(_)'));
    assert.ok(violations.some(v => v.rule === 'no-computed-member-access'));
  });
});

/**
 * The index predicate is the one piece of the gate with real logic in it, so
 * it is tested directly: everything else is a list membership check.
 */
describe('isStaticallyNumericIndex admits only what cannot be a string', () => {
  const indexOf = (expression: string): ts.Node => {
    const source = ts.createSourceFile('x.js', `a[${expression}]`, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
    let found: ts.Node | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isElementAccessExpression(node)) found = node.argumentExpression;
      node.forEachChild(visit);
    };
    visit(source);
    if (!found) throw new Error(`no index found in ${expression}`);
    return found;
  };

  const admits = ['0', '42', 'a.length', 'a.length - 1', '-1', '(2 * 3) + 1', 'a.length - 1 - 1'];
  const rejects = ['k', '"constructor"', '_.i', 'a.length + "x"', 'f(0)', 'a.name', 'k || 0', '`${k}`'];

  for (const expression of admits) {
    it(`admits [${expression}]`, () => assert.ok(isStaticallyNumericIndex(indexOf(expression))));
  }
  for (const expression of rejects) {
    it(`rejects [${expression}]`, () => assert.ok(!isStaticallyNumericIndex(indexOf(expression))));
  }
});

/**
 * The two allowlists are the gate's whole security value: what is *absent*
 * from them is what the emitted code cannot reach. These pin the absences
 * that matter, so that a careless "just add it to the list" cannot quietly
 * re-open a class.
 */
describe('The allowlists exclude the host-reaching names', () => {
  it('no global that yields code execution or host access', () => {
    for (const name of ['eval', 'Function', 'require', 'process', 'globalThis', 'window', 'import']) {
      assert.ok(!ALLOWED_GLOBALS.has(name), `${name} must never be an allowed global`);
    }
  });

  it('no property that yields the prototype chain or re-binds a function', () => {
    for (const name of ['constructor', '__proto__', 'prototype', 'call', 'apply', 'bind', '__defineGetter__']) {
      assert.ok(!ALLOWED_PROPERTIES.has(name), `.${name} must never be an allowed property`);
    }
  });
});
