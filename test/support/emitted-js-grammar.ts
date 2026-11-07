import * as ts from 'typescript';

/**
 * The grammar of the JavaScript Elo is allowed to emit.
 *
 * Elo's emitted output is not JavaScript. It is a very small sub-grammar of
 * JavaScript — and until this file existed, that grammar was never written
 * down, so nothing could notice when an emitter stepped outside it.
 *
 * Six of the twelve security issues fixed between 1.2.1 and 1.2.3 were a
 * single emitter stepping outside it: `at(x, k)` emitting a bare `x[k]` (twice
 * — once on the dynamic path, once on the typed path under `--optimize`),
 * `kDeepMerge` assigning through `result[key]`, `extract()` emitting a regex
 * literal that did not parse. Every one of them is visible in the *shape* of
 * the emission, without running it and without anyone having thought to write
 * the input that triggers it. That last part is the point: a behavioural test
 * only fires if somebody imagined the right program. This fires on whatever
 * the suite happens to compile.
 *
 * ## The rules
 *
 * Outside the prelude helpers:
 *
 *  1. it parses;
 *  2. no computed member access `x[k]` unless `k` is numeric *by construction*
 *     — this is the rule that closes the prototype-chain class, because a
 *     string key is what reaches `constructor` and `__proto__`;
 *  3. no `.property` outside {@link ALLOWED_PROPERTIES}, which bans
 *     `.constructor`, `.prototype`, `.call`, `.apply` and `.bind` by
 *     construction rather than by denylist;
 *  4. no free identifier outside {@link ALLOWED_GLOBALS} — six names — which
 *     bans `eval`, `Function`, `require`, `process` and `globalThis` the same
 *     way;
 *  5. no `new` but `new Error`, no assignment, no `with`.
 *
 * ## Why the helpers are exempt
 *
 * The prelude helpers (`kAt`, `kMember`, `kDeepMerge`, …) are the trusted
 * base: they are *where* the guarded bracket reads and the `defineProperty`
 * writes are supposed to live, so they cannot obey rule 2. They are a closed
 * set of ~46 functions in `src/runtime.ts` that changes rarely and can be read
 * line by line, which is exactly the review that is impossible for an emitter
 * composing strings at runtime.
 *
 * The cost of that exemption is real and should be known: it is why this gate
 * would *not* have caught the `__proto__` write in `kDeepMerge`, which is
 * inside a helper. If the helper set starts growing quickly, this trade needs
 * revisiting.
 *
 * ## Why this is in `test/` and not in `src/`
 *
 * Only because the parser is. `typescript` is a devDependency, and Elo ships
 * one runtime dependency; making the compiler itself fail closed on this
 * property would mean either promoting that dependency or hand-writing a
 * recogniser for the sub-grammar. Worth doing — see
 * `.claude/tasks/todo/0244` — but it is a different decision from having the
 * rule enforced at all, which is what this file is for.
 */

/** One place an emission stepped outside the grammar. */
export interface Violation {
  /** Which rule, for grouping in the failure message. */
  rule: string;
  /** The offending source text, trimmed to something readable. */
  text: string;
  /** What to do about it. */
  detail: string;
}

/**
 * Every global the emitted code is allowed to name.
 *
 * Six, measured over the whole fixture corpus. A list someone has to edit on
 * purpose, in the spirit of `public-surface.unit.test.ts`: adding a name here
 * is a decision about what the emitted language may reach, and `eval`,
 * `Function`, `require`, `process` and `globalThis` are excluded by not being
 * on it rather than by being denied.
 */
export const ALLOWED_GLOBALS = new Set([
  'Error',     // `throw new Error(...)` — the assert and guard emitters
  'DateTime',  // luxon, injected by the host as a parameter
  'Duration',  // luxon
  'Interval',  // luxon
  'Math',      // floor, ceil, abs, trunc, min, max, pow
  'String',    // the String() conversion
]);

/**
 * Every property name the emitted code is allowed to read outside a helper.
 *
 * 54, measured over the whole fixture corpus: luxon's API, the JavaScript
 * String/Array methods the stdlib maps onto, and `message` from a caught
 * error. The security value is in what is *absent* — `constructor`,
 * `__proto__`, `prototype`, `call`, `apply`, `bind` — and absence only means
 * something if the list is closed.
 *
 * Adding a stdlib function that calls a new native method will fail this test.
 * That is the intent: the failure is the review.
 */
export const ALLOWED_PROPERTIES = new Set([
  // Luxon: DateTime / Duration / Interval
  'fromISO', 'fromMillis', 'fromDateTimes', 'fromCodePoint', 'now',
  'plus', 'minus', 'diff', 'startOf', 'endOf', 'toMillis', 'toUTC', 'mapUnits',
  'year', 'month', 'day', 'hour', 'minute', 'start', 'end',
  // Array
  'length', 'map', 'filter', 'reduce', 'find', 'some', 'every', 'sort',
  'join', 'includes', 'indexOf', 'concat', 'flat', 'reverse', 'slice',
  // String
  'split', 'substring', 'replace', 'replaceAll', 'match',
  'toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd',
  'startsWith', 'endsWith',
  // Math
  'abs', 'ceil', 'floor', 'trunc', 'min', 'max',
  // Error
  'message',
]);

/**
 * Whether an index expression cannot possibly be a string.
 *
 * This is the heart of rule 2, and it is stated as a *property* rather than as
 * a pattern on purpose. A bare `x[k]` is safe exactly when `k` cannot name a
 * meta-property, and the way to know that without running anything is for `k`
 * to be built only out of numeric literals, `.length` reads and arithmetic:
 * every such expression evaluates to a number or `NaN`, never to a string.
 *
 * It admits two shapes that occur today — `xs[0]` from `at()` with a literal
 * index, and `a[a.length - 1]` from `last()` — and it would reject
 * `xs[_.i]`, which is precisely the typed-`at()` sandbox escape of 1.2.3.
 */
export function isStaticallyNumericIndex(node: ts.Node): boolean {
  switch (node.kind) {
    case ts.SyntaxKind.NumericLiteral:
      return true;
    case ts.SyntaxKind.PropertyAccessExpression:
      // `.length` is a number on a string, on an array, and `undefined`
      // elsewhere — never a string, which is all this needs.
      return (node as ts.PropertyAccessExpression).name.text === 'length';
    case ts.SyntaxKind.ParenthesizedExpression:
      return isStaticallyNumericIndex((node as ts.ParenthesizedExpression).expression);
    case ts.SyntaxKind.PrefixUnaryExpression: {
      const unary = node as ts.PrefixUnaryExpression;
      const numeric = unary.operator === ts.SyntaxKind.MinusToken
        || unary.operator === ts.SyntaxKind.PlusToken;
      return numeric && isStaticallyNumericIndex(unary.operand);
    }
    case ts.SyntaxKind.BinaryExpression: {
      const binary = node as ts.BinaryExpression;
      const arithmetic = binary.operatorToken.kind === ts.SyntaxKind.PlusToken
        || binary.operatorToken.kind === ts.SyntaxKind.MinusToken
        || binary.operatorToken.kind === ts.SyntaxKind.AsteriskToken;
      // `+` is the one to be careful about: it concatenates when either side
      // is a string, so both sides must be numeric by construction too.
      return arithmetic
        && isStaticallyNumericIndex(binary.left)
        && isStaticallyNumericIndex(binary.right);
    }
    default:
      return false;
  }
}

/** Every name the program binds, anywhere: what makes an identifier not free. */
function declaredNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isParameter(node) || ts.isVariableDeclaration(node)
      || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
      || ts.isBindingElement(node)
    ) {
      if (node.name && ts.isIdentifier(node.name)) names.add(node.name.text);
    }
    node.forEachChild(visit);
  };
  visit(source);
  return names;
}

/** An identifier that names a property rather than a value. */
function isPropertyName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isShorthandPropertyAssignment(parent)) return true;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  return false;
}

function excerpt(node: ts.Node, source: ts.SourceFile): string {
  const text = node.getText(source).replace(/\s+/g, ' ');
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

/**
 * Check one emitted JavaScript program against the grammar.
 *
 * Returns every violation rather than the first, because an emitter that
 * stepped outside usually did so in several places and seeing them together
 * is what identifies the emitter.
 */
export function checkEmittedJavaScript(code: string): Violation[] {
  const violations: Violation[] = [];

  // Rule 1: it parses. `new Function` compiles without executing, and it is
  // the same parser the `--execute` path and `compile()` hand the output to —
  // so this asks the question in the form that actually matters. It is what
  // U+2028 in an extract() template broke.
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
  } catch (error) {
    return [{
      rule: 'parses',
      text: code.length > 90 ? `${code.slice(0, 87)}...` : code,
      detail: `the emission is not valid JavaScript: ${(error as Error).message}`,
    }];
  }

  const source = ts.createSourceFile('emitted.js', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
  const declared = declaredNames(source);

  const visit = (node: ts.Node, inHelper: boolean): void => {
    // The prelude helpers are the trusted base, and they are exactly the
    // function *declarations*: a user lambda emits as an arrow function and an
    // extract() emits as a function expression, so neither is exempted here.
    const helper = inHelper || ts.isFunctionDeclaration(node);

    if (!helper) {
      if (ts.isElementAccessExpression(node) && !isStaticallyNumericIndex(node.argumentExpression)) {
        violations.push({
          rule: 'no-computed-member-access',
          text: excerpt(node, source),
          detail:
            'a bracket read whose index is not numeric by construction can be handed a '
            + "string key ('constructor', '__proto__') and walk the prototype chain. "
            + 'Route it through the kAt helper.',
        });
      }

      if (ts.isPropertyAccessExpression(node) && !ALLOWED_PROPERTIES.has(node.name.text)) {
        violations.push({
          rule: 'no-unlisted-property',
          text: excerpt(node, source),
          detail:
            `'.${node.name.text}' is not in ALLOWED_PROPERTIES. If it is a legitimate `
            + 'native method a new stdlib function needs, add it there on purpose.',
        });
      }

      if (ts.isIdentifier(node) && !isPropertyName(node) && !declared.has(node.text)
          && !ALLOWED_GLOBALS.has(node.text)) {
        violations.push({
          rule: 'no-unlisted-global',
          text: excerpt(node, source),
          detail:
            `'${node.text}' is free in the emission and not in ALLOWED_GLOBALS. The `
            + 'emitted code reaches the host only through names on that list.',
        });
      }

      if (ts.isNewExpression(node)
          && !(ts.isIdentifier(node.expression) && node.expression.text === 'Error')) {
        violations.push({
          rule: 'no-new',
          text: excerpt(node, source),
          detail: 'the emitted code constructs nothing but Error.',
        });
      }

      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        violations.push({
          rule: 'no-assignment',
          text: excerpt(node, source),
          detail:
            'the emitted expression assigns. A write through a computed member is how '
            + '`__proto__` stops being a data key; writes belong in a helper that uses '
            + 'Object.defineProperty.',
        });
      }

      if (node.kind === ts.SyntaxKind.WithStatement) {
        violations.push({
          rule: 'no-with',
          text: excerpt(node, source),
          detail: '`with` makes the scope of every name in its body unknowable.',
        });
      }
    }

    node.forEachChild(child => visit(child, helper));
  };

  visit(source, false);
  return violations;
}

/** A failure message that names the emitter to go and look at. */
export function describeViolations(where: string, code: string, violations: Violation[]): string {
  const lines = violations.map(v => `  [${v.rule}] ${v.text}\n      ${v.detail}`);
  return `${where}: the emission steps outside the allowed JavaScript grammar\n\n`
    + `${lines.join('\n')}\n\n  emitted: ${code.length > 400 ? `${code.slice(0, 397)}...` : code}\n`;
}
