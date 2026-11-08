import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * CLI integration tests for the eloc and elo commands
 */

const ELOC = process.platform === 'win32' ? 'node bin/eloc' : './bin/eloc';
const ELO = process.platform === 'win32' ? 'node bin/elo' : './bin/elo';

function eloc(args: string): string {
  return execSync(`${ELOC} ${args}`, { encoding: 'utf-8' }).trim();
}

function elo(args: string): string {
  return execSync(`${ELO} ${args}`, { encoding: 'utf-8' }).trim();
}

function eloWithError(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${ELO} ${args}`, { encoding: 'utf-8' }).trim();
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString().trim() || '',
      stderr: error.stderr?.toString().trim() || '',
      exitCode: error.status || 1
    };
  }
}

function elocWithError(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${ELOC} ${args}`, { encoding: 'utf-8' }).trim();
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString().trim() || '',
      stderr: error.stderr?.toString().trim() || '',
      exitCode: error.status || 1
    };
  }
}

describe('CLI - Basic compilation', () => {
  it('should compile expression to JavaScript by default', () => {
    const result = eloc('-e "2 + 3"');
    // Type inference enables native JS for known int types
    // Output is always wrapped as function taking _ as input
    assert.strictEqual(result, '(function(_) { return 2 + 3; })');
  });

  it('should compile expression to Ruby', () => {
    const result = eloc('-e "2 + 3" -t ruby');
    // Output is always wrapped as lambda taking _ as input
    assert.strictEqual(result, '->(_) { 2 + 3 }');
  });

  it('should compile expression to SQL', () => {
    const result = eloc('-e "2 + 3" -t sql');
    // SQL is not wrapped
    assert.strictEqual(result, '2 + 3');
  });

  it('should handle complex expressions', () => {
    const result = eloc('-e "2 + 3 * 4"');
    // Type inference enables native JS for known int types
    assert.strictEqual(result, '(function(_) { return 2 + 3 * 4; })');
  });

  it('should handle power operator in JavaScript', () => {
    const result = eloc('-e "2 ^ 3" -t js');
    // Type inference uses Math.pow for known numeric types
    assert.strictEqual(result, '(function(_) { function kPow(l, r) { if (Number.isInteger(l) && Number.isInteger(r) && r > 1 && Math.abs(l) > 1 && r * Math.log2(Math.abs(l)) > 10000000) throw new Error("Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results"); return Math.pow(l, r); } return kPow(2, 3); })');
  });

  it('should handle power operator in Ruby', () => {
    // Through a helper: Ruby's `**` answers a Rational for a negative Integer
    // exponent, where every other target answers a Float.
    const result = eloc('-e "2 ^ 3" -t ruby');
    assert.strictEqual(result, '->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; k_pow(2, 3) }');
  });

  it('should handle power operator in SQL', () => {
    const result = eloc('-e "2 ^ 3" -t sql');
    assert.strictEqual(result, 'POWER(2, 3)');
  });
});

describe('CLI - Temporal expressions', () => {
  it('should compile TODAY to JavaScript', () => {
    const result = eloc('-e "TODAY" -t js');
    assert.strictEqual(result, "(function(_) { return DateTime.now().startOf('day'); })");
  });

  it('should compile TODAY to Ruby', () => {
    const result = eloc('-e "TODAY" -t ruby');
    assert.strictEqual(result, '->(_) { Date.today }');
  });

  it('should compile TODAY to SQL', () => {
    const result = eloc('-e "TODAY" -t sql');
    assert.strictEqual(result, 'CURRENT_DATE');
  });

  it('should compile NOW to JavaScript', () => {
    const result = eloc('-e "NOW" -t js');
    assert.strictEqual(result, '(function(_) { return DateTime.now(); })');
  });

  it('should compile NOW to Ruby', () => {
    const result = eloc('-e "NOW" -t ruby');
    assert.strictEqual(result, '->(_) { DateTime.now }');
  });

  it('should compile NOW to SQL', () => {
    const result = eloc('-e "NOW" -t sql');
    assert.strictEqual(result, 'CURRENT_TIMESTAMP');
  });
});

describe('CLI - Prelude inclusion', () => {
  it('should include Ruby prelude', () => {
    const result = eloc('-e "TODAY" -t ruby -p');
    assert.ok(result.includes("require 'date'"));
    assert.ok(result.includes("require 'active_support/all'"));
    assert.ok(result.includes('->(_) { Date.today }'));
  });

  it('should include JavaScript prelude', () => {
    const result = eloc('-e "TODAY" -t js -p');
    assert.ok(result.includes("require('luxon')"));
    assert.ok(result.includes("DateTime.now().startOf('day')"));
    // Note: elo helpers are now embedded in the expression as needed, not in prelude
  });

  // The SQL target has a prelude — the elo_* PL/pgSQL helpers the compiler
  // calls — but it cannot be prepended to the expression: a pure SQL
  // expression has nowhere to define a function. It is installed in the
  // database once instead, so `--prelude-only` serves it and `-p` refuses.
  it('should emit the SQL runtime helpers with --prelude-only', () => {
    const result = eloc('--prelude-only -t sql');
    assert.ok(result.includes('CREATE OR REPLACE FUNCTION elo_int('));
    assert.ok(result.includes('CREATE OR REPLACE FUNCTION elo_patch('));
    assert.ok(result.includes('eloc --prelude-only -t sql'),
      'the prelude says how to install it');
  });

  it('should refuse -p for SQL and point at --prelude-only', () => {
    const result = elocWithError('-e "TODAY" -t sql -p');
    assert.notEqual(result.exitCode, 0, '-p with -t sql must exit non-zero');
    assert.ok(result.stderr.includes('--prelude-only'), result.stderr);
  });
});

describe('CLI - File input', () => {
  it('should compile from input file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '2 + 3 * 4');

    try {
      const result = eloc(`${inputFile}`);
      // Type inference enables native JS for known int types
      assert.strictEqual(result, '(function(_) { return 2 + 3 * 4; })');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('should compile from input file with target', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '2 ^ 3');

    try {
      const result = eloc(`${inputFile} -t ruby`);
      assert.strictEqual(result, '->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; k_pow(2, 3) }');
    } finally {
      unlinkSync(inputFile);
    }
  });
});

describe('CLI - Type prelude', () => {
  it('scopes every line of a --lines file under the type definitions on top of it', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, "Ints = [Int]\n['1'] |> Ints\n['2', '3'] |> Ints\n");

    try {
      const lines = eloc(`${inputFile} --lines`).split('\n');
      // One expression line in, one line out, each carrying the prelude's
      // parser; the definition itself emits nothing.
      assert.strictEqual(lines.length, 2);
      for (const line of lines) {
        assert.ok(line.includes('const Ints ='), `prelude type missing from: ${line}`);
      }
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('accepts a file that defines types and nothing else', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'types.elo');
    writeFileSync(inputFile, 'Ints = [Int]\nPerson = { name: String }\n');

    try {
      const result = elocWithError(`${inputFile}`);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, '');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('reports a malformed definition rather than compiling it', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'bad.elo');
    writeFileSync(inputFile, 'Ints = [Int\n1 + 1\n');

    try {
      const result = elocWithError(`${inputFile}`);
      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('Compilation error'), result.stderr);
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('checks a line against the types its file declares', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'checked.elo');
    writeFileSync(inputFile, "Ints = [Int]\nsum(['1'] |> Ints)\n");

    try {
      const result = elocWithError(`${inputFile} --lines --typecheck`);
      assert.strictEqual(result.exitCode, 0, result.stderr);
      assert.strictEqual(result.stderr, '');
    } finally {
      unlinkSync(inputFile);
    }
  });
});

describe('CLI - A file is one program', () => {
  const PROGRAM = `Age = Int(a | a >= 0)
Person = {
  name: String,
  age: Age
}

{
  name: 'Alice',
  age: '30'
} |> Person
`;

  function withFile(content: string, run: (path: string) => void): void {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'program.elo');
    writeFileSync(inputFile, content);
    try {
      run(inputFile);
    } finally {
      unlinkSync(inputFile);
    }
  }

  it('compiles an expression that spans several lines', () => {
    withFile('1 +\n  2 +\n  3\n', path => {
      assert.strictEqual(eloc(path), '(function(_) { return 1 + 2 + 3; })');
    });
  });

  it('compiles a type prelude and a multi-line expression as one program', () => {
    withFile(PROGRAM, path => {
      const code = eloc(path);
      assert.strictEqual(code.split('\n').length, 1, 'one program, one line of output');
      assert.ok(code.includes('const Person ='), code);
    });
  });

  it('evaluates a type prelude and a multi-line expression as one program', () => {
    withFile(PROGRAM, path => {
      assert.strictEqual(elo(path), '{"name":"Alice","age":30}');
    });
  });

  it('evaluates examples/test.elo, which is exactly that', () => {
    assert.strictEqual(elo('examples/test.elo'), '{"name":"Alice","age":30}');
    assert.ok(eloc('examples/test.elo').includes('const Person ='));
  });

  it('still accepts a file that defines types and nothing else', () => {
    withFile('Ints = [Int]\nPerson = { name: String }\n', path => {
      const result = elocWithError(path);
      assert.strictEqual(result.exitCode, 0, result.stderr);
      assert.strictEqual(result.stdout, '');
      assert.strictEqual(elo(path), '');
    });
  });

  it('refuses a second expression, and names the flag that wants one per line', () => {
    withFile('1 + 1\n2 + 2\n', path => {
      const result = elocWithError(path);
      assert.strictEqual(result.exitCode, 1);
      assert.ok(result.stderr.includes('--lines'), result.stderr);
      const evaluated = eloWithError(path);
      assert.strictEqual(evaluated.exitCode, 1);
      assert.ok(evaluated.stderr.includes('--lines'), evaluated.stderr);
    });
  });

  it('reports a type error where it is in the file, lines included', () => {
    withFile("'a' +\n  upper(42)\n", path => {
      const result = elocWithError(`${path} --typecheck`);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /^2:3: error: No signature of upper/m);
    });
  });
});

describe('CLI - Imports', () => {
  /**
   * Writes a whole import graph to a temporary directory and runs against its
   * `main.elo`. The paths in a module are relative to the file that wrote
   * them, so the graph has to live on a filesystem to be exercised at all.
   */
  function withModules(files: Record<string, string>, run: (main: string) => void): void {
    const dir = mkdtempSync(join(tmpdir(), 'elo-imports-'));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
    }
    try {
      run(join(dir, 'main.elo'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const TYPES = `Age = Int(a | a >= 0)
Person = {
  name: String,
  age: Age
}
`;

  const REUSABLE = `let
  double_fn = fn( x ~> x * 2 )
in
  {
    double: double_fn,
    one: 1
  }
`;

  it('imports a type and uses it like any other', () => {
    withModules({
      'types.elo': TYPES,
      'main.elo': "import { Person } from './types'\n{ name: 'Alice', age: '30' } |> Person\n",
    }, main => {
      assert.strictEqual(elo(main), '{"name":"Alice","age":30}');
    });
  });

  it('imports a function by name, and the same module through an alias', () => {
    withModules({
      'reusable.elo': REUSABLE,
      'main.elo': "import { double } from './reusable'\nimport './reusable' as r\n[double(21), r.double(1), r.one]\n",
    }, main => {
      assert.strictEqual(elo(main), '[42,2,1]');
    });
  });

  it('binds a module imported twice once', () => {
    withModules({
      'reusable.elo': REUSABLE,
      'main.elo': "import { double, one } from './reusable'\nimport './reusable' as r\ndouble(one)\n",
    }, main => {
      const code = eloc(main);
      assert.strictEqual(code.match(/double_fn = /g)?.length, 1, code);
      assert.strictEqual(elo(main), '2');
    });
  });

  it("resolves a module's own imports against the module, not the program", () => {
    withModules({
      'reusable.elo': REUSABLE,
      'greeting.elo': "import { double } from './reusable'\nlet greet_fn = fn( n ~> double(n) + 1 ) in { greet: greet_fn }\n",
      'main.elo': "import { greet } from './greeting'\ngreet(2)\n",
    }, main => {
      assert.strictEqual(elo(main), '5');
    });
  });

  it('declares the file type prelude after the imports, and may build on them', () => {
    withModules({
      'types.elo': TYPES,
      'main.elo': "import { Person } from './types'\nPeople = [Person]\n[{ name: 'Bob', age: '7' }] |> People\n",
    }, main => {
      assert.strictEqual(elo(main), '[{"name":"Bob","age":7}]');
    });
  });

  it('scopes every line of a --lines source under the imports', () => {
    withModules({
      'reusable.elo': REUSABLE,
      'main.elo': "import { double } from './reusable'\nassert(double(1) == 2)\nassert(double(2) == 4)\n",
    }, main => {
      assert.strictEqual(elo(`${main} --lines`), 'true\ntrue');
    });
  });

  it('keeps an imported type from leaking the names it is built on', () => {
    withModules({
      'types.elo': TYPES,
      'main.elo': "import { Person } from './types'\n'30' |> Age\n",
    }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /Age/);
    });
  });

  it('reports a type error inside a module against the module file', () => {
    withModules({
      'broken.elo': "let f = fn( x ~> x + ('a' - 2) ) in { f: f }\n",
      'main.elo': "import { f } from './broken'\nf(1)\n",
    }, main => {
      const result = elocWithError(`${main} --typecheck`);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /broken\.elo:1:/);
      assert.match(result.stderr, /operator-type-mismatch/);
    });
  });

  it('refuses a module that is not there, naming where it looked', () => {
    withModules({ 'main.elo': "import { x } from './nope'\n1\n" }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /nope\.elo/);
    });
  });

  it('refuses a cycle, naming the chain', () => {
    withModules({
      'a.elo': "import { b } from './b'\n{ a: b }\n",
      'main.elo': "import { a } from './a'\na\n",
      'b.elo': "import { a } from './main'\n{ b: a }\n",
    }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /Import cycle: .*main\.elo -> .*a\.elo -> .*b\.elo -> .*main\.elo/);
    });
  });

  it('refuses a bare path, keeping that spelling free', () => {
    withModules({ 'main.elo': "import { x } from 'types'\n1\n" }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /relative/);
    });
  });

  it('refuses a value import from a module that has no expression', () => {
    withModules({
      'types.elo': TYPES,
      'main.elo': "import { person } from './types'\nperson\n",
    }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /no expression, so it exports no value/);
    });
  });

  it('refuses an import written after the type prelude', () => {
    withModules({
      'types.elo': TYPES,
      'main.elo': "T = Int\nimport { Person } from './types'\n1\n",
    }, main => {
      const result = elocWithError(main);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /An import comes before the type definitions/);
    });
  });

  it('resolves a path given with -e against the working directory', () => {
    assert.strictEqual(
      elo(`-e "import { Person } from './test/fixtures/reference/modules/types'
{ name: 'Alice', age: '30' } |> Person"`),
      '{"name":"Alice","age":30}'
    );
  });
});

describe('CLI - File output', () => {
  it('should write output to file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const outputFile = join(tmpDir, 'output.js');

    try {
      // Run the command - it writes to file and outputs "Compiled to" on stderr
      execSync(`${ELOC} -e "2 + 3" -f ${outputFile}`, { encoding: 'utf-8' });

      const { readFileSync } = require('fs');
      const content = readFileSync(outputFile, 'utf-8').trim();
      // Type inference enables native JS for known int types
      assert.strictEqual(content, '(function(_) { return 2 + 3; })');
    } finally {
      try { unlinkSync(outputFile); } catch {}
    }
  });
});

describe('CLI - Error handling', () => {
  it('should show help with no arguments', () => {
    const result = eloc('');
    assert.ok(result.includes('Elo Compiler (eloc)'));
    assert.ok(result.includes('Usage:'));
  });

  it('should show help with -h', () => {
    const result = eloc('-h');
    assert.ok(result.includes('Elo Compiler (eloc)'));
    assert.ok(result.includes('--expression'));
    assert.ok(result.includes('--target'));
    assert.ok(result.includes('--prelude'));
  });

  it('should error on invalid target', () => {
    const result = elocWithError('-e "2 + 3" -t invalid');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Invalid target'));
  });

  it('should error on missing expression and file', () => {
    const result = elocWithError('-t ruby');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Must provide either'));
  });

  it('should error on invalid syntax', () => {
    const result = elocWithError('-e "2 + +"');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Compilation error'));
  });

  it('should error on non-existent input file', () => {
    const result = elocWithError('/nonexistent/file.elo');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error reading file'));
  });
});

describe('CLI - Long options', () => {
  it('should accept --expression', () => {
    const result = eloc('--expression "2 + 3"');
    // Type inference enables native JS for known int types
    assert.strictEqual(result, '(function(_) { return 2 + 3; })');
  });

  it('should accept --target', () => {
    const result = eloc('-e "2 ^ 3" --target ruby');
    assert.strictEqual(result, '->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; k_pow(2, 3) }');
  });

  it('should accept --prelude', () => {
    const result = eloc('-e "TODAY" -t ruby --prelude');
    assert.ok(result.includes("require 'date'"));
  });

  it('should accept --help', () => {
    const result = eloc('--help');
    assert.ok(result.includes('Elo Compiler (eloc)'));
  });
});

describe('CLI - --typecheck', () => {
  it('says nothing and succeeds on a clean expression', () => {
    const result = elocWithError('--typecheck -e "1 + 2"');
    assert.strictEqual(result.stderr, '');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stdout, '(function(_) { return 1 + 2; })');
  });

  it('reports a type error and exits non-zero', () => {
    const result = elocWithError(`--typecheck -e "'hello' - 5"`);
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /No signature of operator '-' accepts sub\(String, Int\)/);
  });

  it('still emits the code it was asked for', () => {
    // Most of what the checker reports is advisory: the emitted code is
    // identical with and without the flag, so there is no reason to withhold
    // it. A non-Bool condition is one of those.
    const checked = elocWithError(`--typecheck -e "if 1 then 2 else 3"`);
    const unchecked = eloc(`-e "if 1 then 2 else 3"`);
    assert.strictEqual(checked.stdout, unchecked);
  });

  it('changes nothing when the flag is absent', () => {
    const result = elocWithError(`-e "if 1 then 2 else 3"`);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stderr, '');
  });

  it('is not what refuses a missing signature', () => {
    // The one thing the flag is *not* needed for. A call whose argument types
    // are known and match no signature is wrong whatever the target, so it is
    // refused on a plain compile too — see refuseMissingSignature. This used
    // to depend on the target's bindings: `startOfMonth('2026-03-15')` was
    // refused on three targets and compiled on Ruby.
    for (const flags of ['', '--typecheck']) {
      for (const target of ['js', 'ruby', 'python', 'sql']) {
        const result = elocWithError(`${flags} -t ${target} -e "startOfMonth('2026-03-15')"`);
        assert.strictEqual(result.exitCode, 1, `${target} ${flags}`);
        assert.match(result.stderr, /No signature of startOfMonth accepts startOfMonth\(String\)/);
      }
    }
  });

  it('reports every problem in one run', () => {
    const result = elocWithError(`--typecheck -e "year('a') + length(2)"`);
    assert.match(result.stderr, /No signature of year/);
    assert.match(result.stderr, /No signature of length/);
  });

  it('prefixes line numbers for --lines input', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-typecheck-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, "1 + 2\nupper(42)\n# a comment\nyear('x')\n");
    try {
      const result = elocWithError(`--typecheck --lines ${file}`);
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr, /^2:1: error: No signature of upper/m);
      assert.match(result.stderr, /^4:1: error: No signature of year/m);
    } finally {
      unlinkSync(file);
    }
  });

  it('names the diagnostic code', () => {
    const result = elocWithError('--typecheck -e "if 42 then 1 else 2"');
    assert.match(result.stderr, /\[non-bool-condition\]/);
  });

  it('accepts bare column references for the SQL target', () => {
    // A bare name is a column in SQL, so the checker must not be stricter
    // than the compiler there.
    const result = elocWithError('--typecheck -t sql -e "upper(name)"');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stdout, 'UPPER(name)');
  });

  it('is listed in the help output', () => {
    assert.ok(eloc('--help').includes('--typecheck'));
  });

  it('points at the line and column of each problem', () => {
    const result = elocWithError(`--typecheck -e "upper(42) + year('x')"`);
    assert.match(result.stderr, /^1:1: error: No signature of upper/m);
    assert.match(result.stderr, /^1:13: error: No signature of year/m);
  });

  it('--strict reports what the checker cannot type', () => {
    const result = elocWithError('--strict -e "upper(_)"');
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /\[unresolved-any\]/);
  });

  it('--strict is satisfied by a declared schema', () => {
    const result = elocWithError(
      `--strict -e "let X = { a: String }, k = _ |> X in upper(k.a)"`
    );
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stderr, '');
  });

  it('--strict implies --typecheck', () => {
    // Being strict about nothing would be meaningless.
    const result = elocWithError('--strict -e "upper(42)"');
    assert.match(result.stderr, /No signature of upper/);
  });

  it('--input-type declares the shape of _', () => {
    const bad = elocWithError(`--input-type '{ total: Int }' -e "upper(_.total)"`);
    assert.strictEqual(bad.exitCode, 1);
    assert.match(bad.stderr, /No signature of upper accepts upper\(Int\)/);

    const good = elocWithError(`--input-type '{ total: Int }' -e "_.total * 2"`);
    assert.strictEqual(good.exitCode, 0);
  });

  it('--input-type reports a field the declaration does not have', () => {
    const result = elocWithError(`--input-type '{ total: Int }' -e "_.totl"`);
    assert.match(result.stderr, /\[unknown-field\]/);
  });

  it('rejects an unparseable --input-type', () => {
    const result = elocWithError(`--input-type '{ oops' -e "1"`);
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /Invalid --input-type/);
  });

  it('lists the new flags in the help output', () => {
    const help = eloc('--help');
    assert.ok(help.includes('--strict'));
    assert.ok(help.includes('--input-type'));
  });

  it('numbers --lines expressions from the file, not from the line', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-typecheck-loc-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, "1 + 2\n  upper(42)\n");
    try {
      const result = elocWithError(`--typecheck --lines ${file}`);
      assert.match(result.stderr, /^2:3: error: No signature of upper/m);
    } finally {
      unlinkSync(file);
    }
  });
});

describe('CLI - --optimize', () => {
  const DECLARED = `let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b`;
  // A lambda parameter typed from the element type of a declared list. The
  // transform reads a declaration's *shape* on its own, so DECLARED above
  // needs no flag; carrying an element type into a parameter is inference
  // about the call, and that is the checker's.
  const HIGHER_ORDER = `let S = { xs: [Int] }, s = _ |> S in map(s.xs, fn( x ~> x * 2 ))`;

  it('emits a typed operation where the schema declares the types', () => {
    const result = elocWithError(`--optimize -t ruby -e "${DECLARED}"`);
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /k\[:a\] - k\[:b\]/);
    assert.doesNotMatch(result.stdout, /k_sub/);
  });

  it('needs no flag for a declared schema, which the transform reads itself', () => {
    const plain = eloc(`-t ruby -e "${DECLARED}"`);
    assert.match(plain, /k\[:a\] - k\[:b\]/);
    assert.doesNotMatch(plain, /k_sub/);
  });

  it('is the flag that makes the difference, for a lambda parameter', () => {
    // On JavaScript, because that is where an unknown `*` costs a dispatcher:
    // Ruby's `mul` on two unknowns is a bare `*`, so there is nothing to see.
    assert.match(eloc(`-t js -e "${HIGHER_ORDER}"`), /kMul/);
    assert.doesNotMatch(eloc(`--optimize -t js -e "${HIGHER_ORDER}"`), /kMul/);
  });

  it('implies --typecheck', () => {
    const result = elocWithError('--optimize -e "upper(42)"');
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /No signature of upper/);
  });

  it('refuses to annotate a program the checker reported on, out loud', () => {
    // On a reported node the recorded type is a guess rather than a
    // conclusion, so emitting from it would turn a visible error into
    // silently wrong code.
    const result = elocWithError(`--optimize -e "if 1 then 2 else 3"`);
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /\[optimize-refused\]/);
    assert.strictEqual(result.stdout, eloc(`-e "if 1 then 2 else 3"`));
  });

  it('changes nothing for an undeclared input', () => {
    // The checker knows no more than the compiler about a bare `_`, so the
    // benefit is proportional to how much the program declares.
    for (const target of ['js', 'ruby', 'python', 'sql']) {
      const result = elocWithError(`--optimize -t ${target} -e "_ - 1"`);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, eloc(`-t ${target} -e "_ - 1"`));
    }
  });

  it('annotates each line of a --lines file independently', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-optimize-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, `${DECLARED}\n# a comment\n_ - 1\n`);
    try {
      const result = elocWithError(`--optimize --lines -t ruby ${file}`);
      assert.strictEqual(result.exitCode, 0);
      const lines = result.stdout.split('\n');
      assert.match(lines[0], /k\[:a\] - k\[:b\]/);
      assert.strictEqual(lines[1], '');
      assert.match(lines[2], /k_sub\(_, 1\)/);
    } finally {
      unlinkSync(file);
    }
  });

  it('is listed in the help output', () => {
    assert.ok(eloc('--help').includes('--optimize'));
  });
});

/**
 * Tests for the elo evaluator command
 */

describe('Elo Evaluator - Basic evaluation', () => {
  it('should evaluate simple arithmetic', () => {
    const result = elo('-e "2 + 3 * 4"');
    assert.strictEqual(result, '14');
  });

  it('should evaluate power expressions', () => {
    const result = elo('-e "2 ^ 10"');
    assert.strictEqual(result, '1024');
  });

  it('should evaluate boolean expressions', () => {
    const result = elo('-e "2 < 3"');
    assert.strictEqual(result, 'true');
  });

  it('should evaluate string expressions', () => {
    const result = elo('-e "\'hello\'"');
    assert.strictEqual(result, '"hello"');
  });

  it('should evaluate array expressions', () => {
    const result = elo('-e "[1, 2, 3]"');
    assert.strictEqual(result, '[1,2,3]');
  });

  // A multi-line -e payload is one expression, not a sequence of lines: a
  // leading comment must not make the whole thing vanish.
  it('should evaluate a multi-line expression that opens with a comment', () => {
    const result = elo('-e "# a title\nlet x = 1, y = 2 in x + y"');
    assert.strictEqual(result, '3');
  });

  it('should evaluate a multi-line expression with an inner comment', () => {
    const result = elo('-e "let\n  # the first one\n  x = 40,\n  y = 2\nin x + y"');
    assert.strictEqual(result, '42');
  });

  it('should stay silent on a comment-only expression', () => {
    const result = elo('-e "# nothing to see"');
    assert.strictEqual(result, '');
  });
});

describe('Elo Evaluator - Input data', () => {
  it('should evaluate with inline JSON data', () => {
    const result = elo('-e "_.x + _.y" -d \'{"x": 1, "y": 2}\'');
    assert.strictEqual(result, '3');
  });

  it('should evaluate with nested data', () => {
    const result = elo('-e "_.user.name" -d \'{"user": {"name": "Alice"}}\'');
    assert.strictEqual(result, '"Alice"');
  });

  it('should evaluate with data file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const dataFile = join(tmpDir, 'data.json');
    writeFileSync(dataFile, '{"value": 42}');

    try {
      const result = elo(`-e "_.value * 2" -d @${dataFile}`);
      assert.strictEqual(result, '84');
    } finally {
      unlinkSync(dataFile);
    }
  });
});

describe('Elo Evaluator - File input', () => {
  it('should evaluate from input file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '2 + 3');

    try {
      const result = elo(inputFile);
      assert.strictEqual(result, '5');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('should evaluate multiple lines from file with --lines', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '2 + 3\n4 * 5');

    try {
      const result = elo(`${inputFile} --lines`);
      assert.strictEqual(result, '5\n20');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('should skip empty lines and comments with --lines', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '1 + 1\n\n# comment\n2 + 2');

    try {
      const result = elo(`${inputFile} --lines`);
      assert.strictEqual(result, '2\n4');
    } finally {
      unlinkSync(inputFile);
    }
  });
});

describe('Elo Evaluator - Type prelude', () => {
  it('evaluates every --lines expression under its type definitions', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, "Ints = [Int]\nsum(['1', '2'] |> Ints)\nlength(['3'] |> Ints)\n");

    try {
      assert.strictEqual(elo(`${inputFile} --lines`), '3\n1');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('prints nothing for a --lines file that only defines types', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'types.elo');
    writeFileSync(inputFile, 'Ints = [Int]\n');

    try {
      assert.strictEqual(elo(`${inputFile} --lines`), '');
    } finally {
      unlinkSync(inputFile);
    }
  });
});

describe('Elo Evaluator - Error handling', () => {
  it('should show help with no arguments', () => {
    const result = elo('');
    assert.ok(result.includes('Elo Evaluator (elo)'));
    assert.ok(result.includes('Usage:'));
  });

  it('should show help with -h', () => {
    const result = elo('-h');
    assert.ok(result.includes('Elo Evaluator (elo)'));
    assert.ok(result.includes('--expression'));
    assert.ok(result.includes('--data'));
  });

  it('should error on invalid syntax', () => {
    const result = eloWithError('-e "2 + +"');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error'));
  });

  it('should error on missing expression', () => {
    const result = eloWithError('-d \'{"x": 1}\'');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Must provide'));
  });

  it('should error on invalid JSON data', () => {
    const result = eloWithError('-e "_.x" -d "not json"');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error parsing'));
  });
});

describe('CLI - a diagnostic says where it is', () => {
  /**
   * The compile path records positions, not only `--typecheck`, so a refusal
   * an author can act on names the line, the column, and the file it is in.
   * With `--lines` the line counts from the top of the file, not from the top
   * of the line read on its own.
   */
  const dir = mkdtempSync(join(tmpdir(), 'elo-where-'));

  function wrote(name: string, content: string): string {
    const path = join(dir, name);
    writeFileSync(path, content);
    return path;
  }

  it('names the position of an unknown function', () => {
    const result = elocWithError('-e "rond(1, 2)"');
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /Unknown function rond\(Int, Int\) at line 1, column 1/);
  });

  it('names the position of a signature that does not exist', () => {
    const result = elocWithError(`-e "1 + concat('a', 'b', 'c')"`);
    assert.match(result.stderr, /No signature of concat accepts .* at line 1, column 5/);
  });

  it('names the line of the file, not of the line', () => {
    const path = wrote('lines.elo', 'assert(1 == 1)\nassert(2 == 2)\nassert(rond(1) == 1)\n');
    const result = elocWithError(`--lines ${path}`);
    assert.match(result.stderr, /Unknown function rond\(Int\) at line 3, column 8 of /);
    assert.match(result.stderr, /lines\.elo/);
  });

  it('names the file and both positions of a name defined twice', () => {
    const path = wrote('twice.elo', 'T = Int\nT = String\n1\n');
    const result = elocWithError(path);
    assert.match(
      result.stderr,
      /Duplicate type definition 'T' at line 2, column 1 of .*twice\.elo \(first at line 1, column 1\)/
    );
  });

  it('names the module a refusal came from', () => {
    wrote('helper.elo', "let h = fn( n ~> rond(n, 2) ) in { h: h }\n");
    const path = wrote('main.elo', "import { h } from './helper'\nh(1)\n");
    const result = elocWithError(path);
    assert.match(result.stderr, /Unknown function rond\(Any, Int\) at line 1, column 18 of .*helper\.elo/);
  });

  it('reports a runtime failure of the evaluator by line', () => {
    const path = wrote('fails.elo', 'assert(1 == 1)\nassert(1 == 2)\n');
    const result = eloWithError(`${path} --lines`);
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /Error on line 2/);
  });

  it('cleans up', () => {
    rmSync(dir, { recursive: true, force: true });
  });
});
