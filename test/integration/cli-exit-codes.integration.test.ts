import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * The CLI exit codes, which are a public promise.
 *
 * README.md puts in the public tier, breaking it a major release: "The `elo`
 * and `eloc` binaries: their options, and their exit codes (`0` when code was
 * produced, non-zero when the compiler refused)". That sentence was written
 * for 1.2.0 and nothing checked it — and exit status is the half of the CLI
 * contract a script actually branches on, so it is the half most worth
 * pinning.
 *
 * Table-driven on purpose: a path that is not a row here is a path with no
 * promise behind it, and adding a row is how a new option gets one.
 *
 * What this does *not* assert is that non-zero is differentiated. Every
 * refusal, every runtime failure and every usage error exits 1 today. Telling
 * them apart would be a feature; what the table pins is that the three are
 * distinguished from success, which is what was promised.
 */

const NODE = process.execPath;
const ELOC = 'bin/eloc';
const ELO = 'bin/elo';

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function run(bin: string, args: string[], stdin?: string): Run {
  try {
    const stdout = execFileSync(NODE, [bin, ...args], {
      encoding: 'utf-8',
      input: stdin ?? '',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error: any) {
    return {
      code: error.status ?? 1,
      stdout: error.stdout?.toString().trim() ?? '',
      stderr: error.stderr?.toString().trim() ?? '',
    };
  }
}

let dir: string;
const file = (name: string) => join(dir, name);

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'elo-exit-'));
  writeFileSync(file('ok.elo'), '2 + 3\n');
  writeFileSync(file('two.elo'), 'assert(1 == 1)\nassert(2 == 2)\n');
  writeFileSync(file('types-only.elo'), 'T = Int\n');
  writeFileSync(file('no-value.elo'), "import { v } from './types-only'\nv\n");
  writeFileSync(file('missing-module.elo'), "import { Nope } from './nowhere'\n1\n");
  // A cycle: each imports the other.
  writeFileSync(file('cycle-a.elo'), "import { x } from './cycle-b'\n1\n");
  writeFileSync(file('cycle-b.elo'), "import { y } from './cycle-a'\n1\n");
});

after(() => rmSync(dir, { recursive: true, force: true }));

/** `0` — code was produced. */
const PRODUCED: Array<[string, () => string[]]> = [
  ['compiles to js', () => ['-e', '2 + 3']],
  ['compiles to ruby', () => ['-e', '2 + 3', '-t', 'ruby']],
  ['compiles to python', () => ['-e', '2 + 3', '-t', 'python']],
  ['compiles to sql', () => ['-e', '2 + 3', '-t', 'sql']],
  ['compiles a file', () => [file('ok.elo')]],
  ['compiles a file one line at a time', () => ['--lines', file('two.elo')]],
  ['compiles to a file', () => ['-e', '2 + 3', '-f', file('out.js')]],
  ['emits the js prelude', () => ['--prelude-only', '-t', 'js']],
  ['emits the ruby prelude', () => ['--prelude-only', '-t', 'ruby']],
  ['emits the python prelude', () => ['--prelude-only', '-t', 'python']],
  // SQL's prelude is installed rather than prepended, but asking for it on its
  // own is a legitimate request that produces output.
  ['emits the sql prelude', () => ['--prelude-only', '-t', 'sql']],
  ['type-checks a program with nothing to report', () => ['--typecheck', '-e', '1 + 1']],
  ['is strict about a program that declares its input', () =>
    ['--strict', '-e', 'let T = { a: Int }, k = _ |> T in k.a']],
  ['optimizes a program the checker accepts', () =>
    ['--optimize', '-e', 'let T = { a: Int }, k = _ |> T in k.a']],
  ['accepts a declared input type the program satisfies', () =>
    ['--input-type', '{ total: Int }', '-e', '_.total + 1']],
  ['strips guards', () => ['--strip-guards', '-e', 'guard 1 == 1 in 2']],
];

/** Non-zero — the compiler refused, or the host asked for the impossible. */
const REFUSED: Array<[string, () => string[]]> = [
  // The language
  ['a parse error', () => ['-e', '1 +']],
  ['an unknown function', () => ['-e', 'nope(1)']],
  ['a call no signature accepts', () => ['-e', "round('x')"]],
  ['an operator applied to the wrong types', () => ['-e', "'hello' - 5"]],
  ['a duplicate binding', () => ['-e', 'let x = 1, x = 2 in x']],
  ['a list SQL cannot represent', () => ['-e', "[1, 'two']", '-t', 'sql']],
  ['a lambda on SQL', () => ['-e', '[1] |> map(x ~> x * 2)', '-t', 'sql']],
  // Files and modules
  ['a file that is not there', () => [file('nowhere.elo')]],
  ['a file holding two expressions without --lines', () => [file('two.elo')]],
  ['an import of a module that is not there', () => [file('missing-module.elo')]],
  ['an import cycle', () => [file('cycle-a.elo')]],
  ['an import of a value from a module that has none', () => [file('no-value.elo')]],
  // Usage
  ['an unknown target', () => ['-e', '1', '-t', 'cobol']],
  ['a prelude SQL cannot prepend', () => ['-e', '1', '-p', '-t', 'sql']],
  ['an unparseable --input-type', () => ['--input-type', '{ total:', '-e', '1']],
  // The checker, which reports and still emits — see the dedicated test below
  ['--typecheck with a diagnostic', () => ['--typecheck', '-e', 'if 1 then 2 else 3']],
  ['--strict over an undeclared input', () => ['--strict', '-e', '_.price * 2']],
  ['--input-type the program contradicts', () =>
    ['--input-type', '{ total: Int }', '-e', 'upper(_.total)']],
  ['--optimize on a program the checker reported on', () =>
    ['--optimize', '-e', 'if 1 then 2 else 3']],
];

describe('eloc exit codes - 0 when code was produced', () => {
  for (const [what, args] of PRODUCED) {
    it(what, () => {
      const result = run(ELOC, args());
      assert.equal(result.code, 0, `expected 0, got ${result.code}: ${result.stderr}`);
    });
  }

  it('compiles from stdin', () => {
    const result = run(ELOC, ['-'], '2 + 3\n');
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.length > 0, 'produced nothing');
  });
});

describe('eloc exit codes - non-zero when it refused', () => {
  for (const [what, args] of REFUSED) {
    it(what, () => {
      const result = run(ELOC, args());
      assert.notEqual(result.code, 0, `expected non-zero, got 0 with: ${result.stdout}`);
    });
  }
});

/**
 * The checker's exit code is the one most likely to be broken by a later
 * change, because it is the one place where non-zero does *not* mean "no
 * output". The documented behaviour is that the code is emitted anyway, and
 * byte-identically — so a host may compile and report in one pass.
 */
describe('eloc exit codes - --typecheck reports without withholding', () => {
  const program = 'if 1 then 2 else 3';

  it('exits non-zero and still writes the code to stdout', () => {
    const checked = run(ELOC, ['--typecheck', '-e', program]);
    assert.notEqual(checked.code, 0);
    assert.ok(checked.stdout.includes('function'), `emitted nothing: ${checked.stdout}`);
  });

  it('writes the diagnostic to stderr, not stdout', () => {
    const checked = run(ELOC, ['--typecheck', '-e', program]);
    assert.match(checked.stderr, /non-bool-condition/);
    assert.doesNotMatch(checked.stdout, /non-bool-condition/);
  });

  it('emits exactly what it emits without the flag', () => {
    const plain = run(ELOC, ['-e', program]);
    const checked = run(ELOC, ['--typecheck', '-e', program]);
    assert.equal(plain.code, 0);
    assert.equal(checked.stdout, plain.stdout);
  });

  it('says so and stays unannotated when --optimize refuses', () => {
    const plain = run(ELOC, ['-e', program]);
    const optimized = run(ELOC, ['--optimize', '-e', program]);
    assert.notEqual(optimized.code, 0);
    assert.match(optimized.stderr, /optimize-refused/);
    assert.equal(optimized.stdout, plain.stdout);
  });
});

describe('elo exit codes', () => {
  it('exits 0 having evaluated an expression', () => {
    const result = run(ELO, ['-e', '2 + 3']);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, '5');
  });

  it('exits 0 evaluating a file, and from stdin', () => {
    assert.equal(run(ELO, [file('ok.elo')]).code, 0);
    assert.equal(run(ELO, ['-'], '2 + 3\n').code, 0);
  });

  it('exits non-zero when the compiler refuses', () => {
    for (const args of [['-e', '1 +'], ['-e', 'nope(1)'], [file('nowhere.elo')]]) {
      assert.notEqual(run(ELO, args).code, 0, `expected non-zero for ${args.join(' ')}`);
    }
  });

  // A guard, a check, an assertion and a schema are runtime failures rather
  // than compiler refusals. They share exit 1 with a refusal today; the two
  // being distinguishable is a question, not a promise (task 0224).
  it('exits non-zero when the expression fails at run time', () => {
    const cases: Array<[string, string]> = [
      ['assert(1 == 2)', /Assertion failed/.source],
      ['guard 1 == 2 in 3', /guard failed/.source],
      ["let T = { a: Int } in { a: 'x' } |> T", /expected Int/.source],
    ];
    for (const [program, expected] of cases) {
      const result = run(ELO, ['-e', program]);
      assert.notEqual(result.code, 0, `expected non-zero for ${program}`);
      assert.match(result.stderr + result.stdout, new RegExp(expected));
    }
  });

  it('exits 0 on an expression whose value is null', () => {
    // `null` is a value in Elo, so producing one is a success. Noted because
    // `1 / 0` also prints null here, which is task 0225 — an expression with
    // no answer reporting as a successful evaluation of nothing.
    const result = run(ELO, ['-e', 'null']);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, 'null');
  });
});

describe('both binaries agree on the trivial cases', () => {
  it('exits 0 for --help and --version', () => {
    for (const bin of [ELOC, ELO]) {
      for (const flag of ['--help', '--version']) {
        const result = run(bin, [flag]);
        assert.equal(result.code, 0, `${bin} ${flag} exited ${result.code}`);
        assert.ok(result.stdout.length > 0, `${bin} ${flag} printed nothing`);
      }
    }
  });
});
