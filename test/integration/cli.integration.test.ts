import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * CLI integration tests for the kc command
 */

const KC = './bin/kc';

function kc(args: string): string {
  return execSync(`${KC} ${args}`, { encoding: 'utf-8' }).trim();
}

function kcWithError(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${KC} ${args}`, { encoding: 'utf-8' }).trim();
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
    const result = kc('-e "2 + 3"');
    // Type inference enables native JS for known int types
    assert.strictEqual(result, '2 + 3');
  });

  it('should compile expression to Ruby', () => {
    const result = kc('-e "2 + 3" -t ruby');
    assert.strictEqual(result, '2 + 3');
  });

  it('should compile expression to SQL', () => {
    const result = kc('-e "2 + 3" -t sql');
    assert.strictEqual(result, '2 + 3');
  });

  it('should handle complex expressions', () => {
    const result = kc('-e "2 + 3 * 4"');
    // Type inference enables native JS for known int types
    assert.strictEqual(result, '2 + 3 * 4');
  });

  it('should handle power operator in JavaScript', () => {
    const result = kc('-e "2 ^ 3" -t js');
    // Type inference uses Math.pow for known numeric types
    assert.strictEqual(result, 'Math.pow(2, 3)');
  });

  it('should handle power operator in Ruby', () => {
    const result = kc('-e "2 ^ 3" -t ruby');
    assert.strictEqual(result, '2 ** 3');
  });

  it('should handle power operator in SQL', () => {
    const result = kc('-e "2 ^ 3" -t sql');
    assert.strictEqual(result, 'POWER(2, 3)');
  });
});

describe('CLI - Temporal expressions', () => {
  it('should compile TODAY to JavaScript', () => {
    const result = kc('-e "TODAY" -t js');
    assert.strictEqual(result, "dayjs().startOf('day')");
  });

  it('should compile TODAY to Ruby', () => {
    const result = kc('-e "TODAY" -t ruby');
    assert.strictEqual(result, 'Date.today');
  });

  it('should compile TODAY to SQL', () => {
    const result = kc('-e "TODAY" -t sql');
    assert.strictEqual(result, 'CURRENT_DATE');
  });

  it('should compile NOW to JavaScript', () => {
    const result = kc('-e "NOW" -t js');
    assert.strictEqual(result, 'dayjs()');
  });

  it('should compile NOW to Ruby', () => {
    const result = kc('-e "NOW" -t ruby');
    assert.strictEqual(result, 'DateTime.now');
  });

  it('should compile NOW to SQL', () => {
    const result = kc('-e "NOW" -t sql');
    assert.strictEqual(result, 'CURRENT_TIMESTAMP');
  });
});

describe('CLI - Prelude inclusion', () => {
  it('should include Ruby prelude', () => {
    const result = kc('-e "TODAY" -t ruby -p');
    assert.ok(result.includes("require 'date'"));
    assert.ok(result.includes("require 'active_support/all'"));
    assert.ok(result.includes('Date.today'));
  });

  it('should include JavaScript prelude', () => {
    const result = kc('-e "TODAY" -t js -p');
    assert.ok(result.includes("require('dayjs')"));
    assert.ok(result.includes('dayjs.extend(duration)'));
    assert.ok(result.includes("dayjs().startOf('day')"));
    // Note: klang helpers are now embedded in the expression as needed, not in prelude
  });

  it('should include minimal SQL prelude', () => {
    const result = kc('-e "TODAY" -t sql -p');
    assert.ok(result.includes('No prelude needed'));
    assert.ok(result.includes('CURRENT_DATE'));
  });
});

describe('CLI - File input', () => {
  it('should compile from input file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'klang-test-'));
    const inputFile = join(tmpDir, 'test.klang');
    writeFileSync(inputFile, '2 + 3 * 4');

    try {
      const result = kc(`${inputFile}`);
      // Type inference enables native JS for known int types
      assert.strictEqual(result, '2 + 3 * 4');
    } finally {
      unlinkSync(inputFile);
    }
  });

  it('should compile from input file with target', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'klang-test-'));
    const inputFile = join(tmpDir, 'test.klang');
    writeFileSync(inputFile, '2 ^ 3');

    try {
      const result = kc(`${inputFile} -t ruby`);
      assert.strictEqual(result, '2 ** 3');
    } finally {
      unlinkSync(inputFile);
    }
  });
});

describe('CLI - File output', () => {
  it('should write output to file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'klang-test-'));
    const outputFile = join(tmpDir, 'output.js');

    try {
      // Run the command - it writes to file and outputs "Compiled to" on stderr
      execSync(`${KC} -e "2 + 3" -f ${outputFile}`, { encoding: 'utf-8' });

      const { readFileSync } = require('fs');
      const content = readFileSync(outputFile, 'utf-8').trim();
      // Type inference enables native JS for known int types
      assert.strictEqual(content, '2 + 3');
    } finally {
      try { unlinkSync(outputFile); } catch {}
    }
  });
});

describe('CLI - Error handling', () => {
  it('should show help with no arguments', () => {
    const result = kc('');
    assert.ok(result.includes('Klang Compiler (kc)'));
    assert.ok(result.includes('Usage:'));
  });

  it('should show help with -h', () => {
    const result = kc('-h');
    assert.ok(result.includes('Klang Compiler (kc)'));
    assert.ok(result.includes('--expression'));
    assert.ok(result.includes('--target'));
    assert.ok(result.includes('--prelude'));
  });

  it('should error on invalid target', () => {
    const result = kcWithError('-e "2 + 3" -t invalid');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Invalid target'));
  });

  it('should error on missing expression and file', () => {
    const result = kcWithError('-t ruby');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Must provide either'));
  });

  it('should error on invalid syntax', () => {
    const result = kcWithError('-e "2 + +"');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Compilation error'));
  });

  it('should error on non-existent input file', () => {
    const result = kcWithError('/nonexistent/file.klang');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error reading file'));
  });
});

describe('CLI - Long options', () => {
  it('should accept --expression', () => {
    const result = kc('--expression "2 + 3"');
    // Type inference enables native JS for known int types
    assert.strictEqual(result, '2 + 3');
  });

  it('should accept --target', () => {
    const result = kc('-e "2 ^ 3" --target ruby');
    assert.strictEqual(result, '2 ** 3');
  });

  it('should accept --prelude', () => {
    const result = kc('-e "TODAY" -t ruby --prelude');
    assert.ok(result.includes("require 'date'"));
  });

  it('should accept --help', () => {
    const result = kc('--help');
    assert.ok(result.includes('Klang Compiler (kc)'));
  });
});
