import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from '../../src/index';
import { dateLiteral, dateTimeLiteral, durationLiteral } from '../../src/ast';

describe('Temporal - Date Literals', () => {
  it('should parse date literal', () => {
    const ast = parse('D2024-01-15');
    assert.strictEqual(ast.type, 'date');
    if (ast.type === 'date') {
      assert.strictEqual(ast.value, '2024-01-15');
    }
  });

  it('should compile date to Ruby', () => {
    const ast = dateLiteral('2024-01-15');
    assert.strictEqual(compileToRuby(ast), "Date.parse('2024-01-15')");
  });

  it('should compile date to JavaScript', () => {
    const ast = dateLiteral('2024-01-15');
    assert.strictEqual(compileToJavaScript(ast), "new Date('2024-01-15')");
  });

  it('should compile date to SQL', () => {
    const ast = dateLiteral('2024-01-15');
    assert.strictEqual(compileToSQL(ast), "DATE '2024-01-15'");
  });
});

describe('Temporal - DateTime Literals', () => {
  it('should parse datetime literal', () => {
    const ast = parse('D2024-01-15T10:30:00Z');
    assert.strictEqual(ast.type, 'datetime');
    if (ast.type === 'datetime') {
      assert.strictEqual(ast.value, '2024-01-15T10:30:00Z');
    }
  });

  it('should compile datetime to Ruby', () => {
    const ast = dateTimeLiteral('2024-01-15T10:30:00Z');
    assert.strictEqual(compileToRuby(ast), "DateTime.parse('2024-01-15T10:30:00Z')");
  });

  it('should compile datetime to JavaScript', () => {
    const ast = dateTimeLiteral('2024-01-15T10:30:00Z');
    assert.strictEqual(compileToJavaScript(ast), "new Date('2024-01-15T10:30:00Z')");
  });

  it('should compile datetime to SQL', () => {
    const ast = dateTimeLiteral('2024-01-15T10:30:00Z');
    assert.strictEqual(compileToSQL(ast), "TIMESTAMP '2024-01-15 10:30:00'");
  });
});

describe('Temporal - Duration Literals', () => {
  it('should parse duration - days', () => {
    const ast = parse('P1D');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P1D');
    }
  });

  it('should parse duration - hours and minutes', () => {
    const ast = parse('PT1H30M');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'PT1H30M');
    }
  });

  it('should parse duration - years, months, days', () => {
    const ast = parse('P1Y2M3D');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P1Y2M3D');
    }
  });

  it('should parse complex duration', () => {
    const ast = parse('P1Y2M3DT4H5M6S');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P1Y2M3DT4H5M6S');
    }
  });

  it('should compile duration to Ruby', () => {
    const ast = durationLiteral('P1D');
    assert.strictEqual(compileToRuby(ast), "ActiveSupport::Duration.parse('P1D')");
  });

  it('should compile duration to JavaScript', () => {
    const ast = durationLiteral('P1D');
    assert.strictEqual(compileToJavaScript(ast), "Duration.parse('P1D')");
  });

  it('should compile duration to SQL', () => {
    const ast = durationLiteral('P1D');
    assert.strictEqual(compileToSQL(ast), "INTERVAL 'P1D'");
  });
});

describe('Temporal - Date Arithmetic', () => {
  it('should parse date + duration', () => {
    const ast = parse('D2024-01-15 + P1D');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
      assert.strictEqual(ast.left.type, 'date');
      assert.strictEqual(ast.right.type, 'duration');
    }
  });

  it('should compile date + duration', () => {
    const ast = parse('D2024-01-15 + P1D');
    assert.strictEqual(
      compileToRuby(ast),
      "Date.parse('2024-01-15') + ActiveSupport::Duration.parse('P1D')"
    );
    assert.strictEqual(
      compileToJavaScript(ast),
      "Duration.parse('P1D').addTo(new Date('2024-01-15'))"
    );
    assert.strictEqual(
      compileToSQL(ast),
      "DATE '2024-01-15' + INTERVAL 'P1D'"
    );
  });

  it('should parse date - date', () => {
    const ast = parse('D2024-12-31 - D2024-01-01');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '-');
      assert.strictEqual(ast.left.type, 'date');
      assert.strictEqual(ast.right.type, 'date');
    }
  });
});

describe('Temporal - Date Comparisons', () => {
  it('should parse date < date', () => {
    const ast = parse('D2024-01-15 < D2024-12-31');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '<');
    }
  });

  it('should compile date comparison', () => {
    const ast = parse('D2024-01-15 < D2024-12-31');
    assert.strictEqual(
      compileToRuby(ast),
      "Date.parse('2024-01-15') < Date.parse('2024-12-31')"
    );
    assert.strictEqual(
      compileToJavaScript(ast),
      "new Date('2024-01-15') < new Date('2024-12-31')"
    );
    assert.strictEqual(
      compileToSQL(ast),
      "DATE '2024-01-15' < DATE '2024-12-31'"
    );
  });
});

describe('Temporal - Complex Expressions', () => {
  it('should parse date range check', () => {
    const ast = parse('event_date >= D2024-01-01 && event_date <= D2024-01-01 + P30D');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '&&');
    }
  });

  it('should parse duration arithmetic', () => {
    const ast = parse('P1D + PT12H');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '+');
      assert.strictEqual(ast.left.type, 'duration');
      assert.strictEqual(ast.right.type, 'duration');
    }
  });

  it('should compile age check expression', () => {
    const ast = parse('current_date - birth_date > P18Y');
    const ruby = compileToRuby(ast);
    const js = compileToJavaScript(ast);
    const sql = compileToSQL(ast);

    assert.ok(ruby.includes('P18Y'));
    assert.ok(js.includes('P18Y'));
    assert.ok(sql.includes('P18Y'));
  });
});

describe('Temporal - Temporal Keywords', () => {
  it('should parse NOW keyword', () => {
    const ast = parse('NOW');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'NOW');
    }
  });

  it('should parse TODAY keyword', () => {
    const ast = parse('TODAY');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'TODAY');
    }
  });

  it('should parse TOMORROW keyword', () => {
    const ast = parse('TOMORROW');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'TOMORROW');
    }
  });

  it('should parse YESTERDAY keyword', () => {
    const ast = parse('YESTERDAY');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'YESTERDAY');
    }
  });

  it('should compile NOW to JavaScript', () => {
    const ast = parse('NOW');
    assert.strictEqual(compileToJavaScript(ast), 'new Date()');
  });

  it('should compile TODAY to JavaScript', () => {
    const ast = parse('TODAY');
    assert.strictEqual(compileToJavaScript(ast), 'new Date(new Date().setHours(0, 0, 0, 0))');
  });

  it('should compile TOMORROW to JavaScript', () => {
    const ast = parse('TOMORROW');
    assert.strictEqual(compileToJavaScript(ast), 'new Date(new Date().setHours(24, 0, 0, 0))');
  });

  it('should compile YESTERDAY to JavaScript', () => {
    const ast = parse('YESTERDAY');
    assert.strictEqual(compileToJavaScript(ast), 'new Date(new Date().setHours(-24, 0, 0, 0))');
  });

  it('should compile NOW to Ruby', () => {
    const ast = parse('NOW');
    assert.strictEqual(compileToRuby(ast), 'DateTime.now');
  });

  it('should compile TODAY to Ruby', () => {
    const ast = parse('TODAY');
    assert.strictEqual(compileToRuby(ast), 'Date.today');
  });

  it('should compile TOMORROW to Ruby', () => {
    const ast = parse('TOMORROW');
    assert.strictEqual(compileToRuby(ast), 'Date.today + 1');
  });

  it('should compile YESTERDAY to Ruby', () => {
    const ast = parse('YESTERDAY');
    assert.strictEqual(compileToRuby(ast), 'Date.today - 1');
  });

  it('should compile NOW to SQL', () => {
    const ast = parse('NOW');
    assert.strictEqual(compileToSQL(ast), 'CURRENT_TIMESTAMP');
  });

  it('should compile TODAY to SQL', () => {
    const ast = parse('TODAY');
    assert.strictEqual(compileToSQL(ast), 'CURRENT_DATE');
  });

  it('should compile TOMORROW to SQL', () => {
    const ast = parse('TOMORROW');
    assert.strictEqual(compileToSQL(ast), 'CURRENT_DATE + INTERVAL \'1 day\'');
  });

  it('should compile YESTERDAY to SQL', () => {
    const ast = parse('YESTERDAY');
    assert.strictEqual(compileToSQL(ast), 'CURRENT_DATE - INTERVAL \'1 day\'');
  });

  it('should use temporal keywords in expressions', () => {
    const ast = parse('TODAY > D2024-01-01');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      assert.strictEqual(ast.right.type, 'date');
    }
  });
});

describe('Temporal - Week Boundary Keywords (SOW/EOW)', () => {
  // Parsing tests
  it('should parse SOW keyword', () => {
    const ast = parse('SOW');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'SOW');
    }
  });

  it('should parse EOW keyword', () => {
    const ast = parse('EOW');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'EOW');
    }
  });

  // JavaScript compilation tests
  it('should compile SOW to JavaScript', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('isoWeek')");
  });

  it('should compile EOW to JavaScript', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('isoWeek')");
  });

  // Ruby compilation tests
  it('should compile SOW to Ruby', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_week');
  });

  it('should compile EOW to Ruby', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_week');
  });

  // SQL compilation tests
  it('should compile SOW to SQL', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToSQL(ast), "date_trunc('week', CURRENT_DATE)");
  });

  it('should compile EOW to SQL', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToSQL(ast), "date_trunc('week', CURRENT_DATE) + INTERVAL '6 days'");
  });

  // Expression tests
  it('should use SOW in expressions', () => {
    const ast = parse('SOW <= TODAY');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      if (ast.left.type === 'temporal_keyword') {
        assert.strictEqual(ast.left.keyword, 'SOW');
      }
    }
  });

  it('should use EOW in expressions', () => {
    const ast = parse('EOW >= TODAY');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      if (ast.left.type === 'temporal_keyword') {
        assert.strictEqual(ast.left.keyword, 'EOW');
      }
    }
  });

  it('should compare SOW and EOW', () => {
    const ast = parse('SOW < EOW');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '<');
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      assert.strictEqual(ast.right.type, 'temporal_keyword');
    }
  });
});

describe('Temporal - Edge Cases', () => {
  it('should handle datetime with milliseconds', () => {
    const ast = parse('D2024-01-15T10:30:00.123Z');
    assert.strictEqual(ast.type, 'datetime');
    if (ast.type === 'datetime') {
      assert.strictEqual(ast.value, '2024-01-15T10:30:00.123Z');
    }
  });

  it('should handle fractional durations', () => {
    const ast = parse('PT0.5H');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'PT0.5H');
    }
  });

  it('should handle week duration', () => {
    const ast = parse('P2W');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P2W');
    }
  });
});
