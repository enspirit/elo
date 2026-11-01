import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/parser';
import { typecheckWithAnnotations } from '../../src/typecheck';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';
import { compileToSQL } from '../../src/compilers/sql';

/**
 * Feeding the checker's types back into codegen.
 *
 * The transform understands literals and the stdlib's return types; it does
 * not understand declared schemas. `_ |> Order` is `any` to it, and
 * `order.total` with it, so every operation on a coerced value falls to
 * dynamic dispatch — even though the author declared the types and the runtime
 * validated them:
 *
 *     let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b
 *       ->  k_sub(k[:a], k[:b])            Ruby, before
 *       ->  k[:a] - k[:b]                  Ruby, with the annotations
 *
 * The checker already walks the same AST and computes a type for every node,
 * so it can hand that map to `transform`, which consults it wherever its own
 * inference says `any`. One direction only: the annotation can make the
 * emission more precise, never less.
 *
 * These tests pin the win. The equivalence of the two emissions is a separate
 * and more important property, asserted over the fixture corpus in
 * `optimize-equivalence.integration.test.ts`.
 */

/** Compile with the checker's annotations, as `eloc --optimize` does. */
function optimized(source: string, target: 'js' | 'ruby' | 'python' | 'sql'): string {
  const ast = parse(source);
  const { types, diagnostics } = typecheckWithAnnotations(ast, {
    allowUndefinedVariables: target === 'sql',
  });
  assert.deepStrictEqual(
    diagnostics.map(d => d.message),
    [],
    `the program must be one the checker can justify, or there is nothing to feed back`
  );
  switch (target) {
    case 'js': return compileToJavaScript(ast, { types });
    case 'ruby': return compileToRuby(ast, { types });
    case 'python': return compileToPython(ast, { types });
    case 'sql': return compileToSQL(ast, { types });
  }
}

function plain(source: string, target: 'js' | 'ruby' | 'python' | 'sql'): string {
  const ast = parse(source);
  switch (target) {
    case 'js': return compileToJavaScript(ast);
    case 'ruby': return compileToRuby(ast);
    case 'python': return compileToPython(ast);
    case 'sql': return compileToSQL(ast);
  }
}

/** Dynamic dispatchers, which a fully typed program has no use for. */
const DISPATCHERS = /\b(kAdd|kSub|kMul|kDiv|kEq|kNeq|k_add|k_sub|k_mul|k_div|k_eq|k_neq)\b/g;

function dispatchersIn(code: string): string[] {
  return [...new Set(code.match(DISPATCHERS) ?? [])].sort();
}

/**
 * The six declared-schema programs the task measured: order total, discounted
 * price, margin, label comparison, map over a list, and a plain subtraction.
 */
const PROGRAMS: Array<[string, string]> = [
  ['subtraction', "let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b"],
  ['order total', "let Order = { qty: Int, price: Float }, o = _ |> Order in o.qty * o.price"],
  ['discounted price', "let P = { price: Float, discount: Float }, p = _ |> P in p.price * (1 - p.discount)"],
  ['margin', "let M = { revenue: Float, cost: Float }, m = _ |> M in (m.revenue - m.cost) / m.revenue"],
  ['label comparison', "let L = { label: String }, l = _ |> L in l.label == 'done'"],
  ['map over a list', "let S = { xs: [Int] }, s = _ |> S in map(s.xs, fn( x ~> x * 2 ))"],
];

const TARGETS: Array<'js' | 'ruby' | 'python'> = ['js', 'ruby', 'python'];

describe('Compiling with the checker\'s types', () => {
  for (const [name, source] of PROGRAMS) {
    for (const target of TARGETS) {
      it(`${name} needs no dynamic dispatcher on ${target}`, () => {
        assert.deepStrictEqual(
          dispatchersIn(optimized(source, target)),
          [],
          `every operand's type is declared in this program, so nothing should ` +
          `be decided at runtime.\n\n${optimized(source, target)}`
        );
      });
    }
  }

  it('is the annotations that make the difference, not the programs', () => {
    // Without the map the same programs do pull dispatchers in — otherwise the
    // assertions above would pass for the wrong reason.
    const withoutAnnotations = PROGRAMS.flatMap(([name, source]) =>
      TARGETS.flatMap(target =>
        dispatchersIn(plain(source, target)).map(helper => `${name}/${target}: ${helper}`)
      )
    );
    assert.ok(
      withoutAnnotations.length > 0,
      'the unannotated emission should still dispatch at runtime'
    );
  });

  describe('what the annotation reaches', () => {
    it('types a field of a declared schema', () => {
      const code = optimized("let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b", 'ruby');
      assert.match(code, /k\[:a\] - k\[:b\]/);
    });

    it('types a lambda parameter from the element type of a declared list', () => {
      const code = optimized("let S = { xs: [Int] }, s = _ |> S in map(s.xs, fn( x ~> x * 2 ))", 'python');
      assert.match(code, /x \* 2/);
    });

    it('types a let-bound value carrying a schema field through', () => {
      const code = optimized("let T = { a: Int }, k = _ |> T, v = k.a in v - 1", 'ruby');
      assert.match(code, /v - 1/);
    });

    it('leaves an undeclared input exactly as it was', () => {
      // The checker knows no more than the transform about a bare `_`, so the
      // benefit is proportional to how much the program declares.
      for (const target of [...TARGETS, 'sql' as const]) {
        assert.strictEqual(optimized('_ - 1', target), plain('_ - 1', target));
      }
    });

    it('never overrides a type the transform already knew', () => {
      // A concrete answer from the transform wins, so an annotation cannot
      // make an emission worse even if the checker disagreed.
      for (const target of [...TARGETS, 'sql' as const]) {
        assert.strictEqual(optimized('1 - 2', target), plain('1 - 2', target));
      }
    });
  });
});
