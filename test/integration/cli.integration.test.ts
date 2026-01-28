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
    const result = eloc('-e "2 ^ 3" -t ruby');
    assert.strictEqual(result, '->(_) { 2 ** 3 }');
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
      assert.strictEqual(result, '->(_) { 2 ** 3 }');
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
    assert.strictEqual(result, '->(_) { 2 ** 3 }');
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
