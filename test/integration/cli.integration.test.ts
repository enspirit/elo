import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
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
    assert.strictEqual(result, '(function(_) { return Math.pow(2, 3); })');
  });

  it('should handle power operator in Ruby', () => {
    // Through a helper: Ruby's `**` answers a Rational for a negative Integer
    // exponent, where every other target answers a Float.
    const result = eloc('-e "2 ^ 3" -t ruby');
    assert.strictEqual(result, '->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; k_pow(2, 3) }');
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

  it('should include minimal SQL prelude', () => {
    const result = eloc('-e "TODAY" -t sql -p');
    assert.ok(result.includes('No prelude needed'));
    assert.ok(result.includes('CURRENT_DATE'));
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
      assert.strictEqual(result, '->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; k_pow(2, 3) }');
    } finally {
      unlinkSync(inputFile);
    }
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
    assert.strictEqual(result, '->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; k_pow(2, 3) }');
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
    // Checking is advisory: the emitted code is identical with and without
    // the flag, so there is no reason to withhold it.
    const checked = elocWithError(`--typecheck -e "'hello' - 5"`);
    const unchecked = eloc(`-e "'hello' - 5"`);
    assert.strictEqual(checked.stdout, unchecked);
  });

  it('changes nothing when the flag is absent', () => {
    const result = elocWithError(`-e "'hello' - 5"`);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stderr, '');
  });

  it('reports every problem in one run', () => {
    const result = elocWithError(`--typecheck -e "year('a') + length(2)"`);
    assert.match(result.stderr, /No signature of year/);
    assert.match(result.stderr, /No signature of length/);
  });

  it('prefixes line numbers for multi-line input', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-typecheck-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, "1 + 2\nupper(42)\n# a comment\nyear('x')\n");
    try {
      const result = elocWithError(`--typecheck ${file}`);
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

  it('numbers lines from the file, not from the expression', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-typecheck-loc-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, "1 + 2\n  upper(42)\n");
    try {
      const result = elocWithError(`--typecheck ${file}`);
      assert.match(result.stderr, /^2:3: error: No signature of upper/m);
    } finally {
      unlinkSync(file);
    }
  });
});

describe('CLI - --optimize', () => {
  const DECLARED = `let T = { a: Int, b: Int }, k = _ |> T in k.a - k.b`;

  it('emits a typed operation where the schema declares the types', () => {
    const result = elocWithError(`--optimize -t ruby -e "${DECLARED}"`);
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /k\[:a\] - k\[:b\]/);
    assert.doesNotMatch(result.stdout, /k_sub/);
  });

  it('is the flag that makes the difference', () => {
    const plain = eloc(`-t ruby -e "${DECLARED}"`);
    assert.match(plain, /k_sub/);
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
    const result = elocWithError(`--optimize -e "'hello' - 5"`);
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /\[optimize-refused\]/);
    assert.strictEqual(result.stdout, eloc(`-e "'hello' - 5"`));
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

  it('annotates each line of a file independently', () => {
    const dir = mkdtempSync(join(tmpdir(), 'elo-optimize-'));
    const file = join(dir, 'input.elo');
    writeFileSync(file, `${DECLARED}\n# a comment\n_ - 1\n`);
    try {
      const result = elocWithError(`--optimize -t ruby ${file}`);
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

  it('should evaluate multiple lines from file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '2 + 3\n4 * 5');

    try {
      const result = elo(inputFile);
      assert.strictEqual(result, '5\n20');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('should skip empty lines and comments', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elo-test-'));
    const inputFile = join(tmpDir, 'test.elo');
    writeFileSync(inputFile, '1 + 1\n\n# comment\n2 + 2');

    try {
      const result = elo(inputFile);
      assert.strictEqual(result, '2\n4');
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
