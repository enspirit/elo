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
    assert.strictEqual(compileToJavaScript(ast), "dayjs('2024-01-15')");
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
    assert.strictEqual(compileToJavaScript(ast), "dayjs('2024-01-15T10:30:00Z')");
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
    assert.strictEqual(compileToJavaScript(ast), "dayjs.duration('P1D')");
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
    // JavaScript uses type-aware dayjs.add() method
    assert.strictEqual(
      compileToJavaScript(ast),
      "dayjs('2024-01-15').add(dayjs.duration('P1D'))"
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

  it('should compile duration scaling (n * duration)', () => {
    const ast = parse('2 * P1D');
    assert.strictEqual(
      compileToJavaScript(ast),
      "dayjs.duration(dayjs.duration('P1D').asMilliseconds() * 2)"
    );
    assert.strictEqual(
      compileToRuby(ast),
      "2 * ActiveSupport::Duration.parse('P1D')"
    );
    assert.strictEqual(
      compileToSQL(ast),
      "2 * INTERVAL 'P1D'"
    );
  });

  it('should compile duration scaling (duration * n)', () => {
    const ast = parse('P1D * 2');
    assert.strictEqual(
      compileToJavaScript(ast),
      "dayjs.duration(dayjs.duration('P1D').asMilliseconds() * 2)"
    );
    assert.strictEqual(
      compileToRuby(ast),
      "ActiveSupport::Duration.parse('P1D') * 2"
    );
    assert.strictEqual(
      compileToSQL(ast),
      "INTERVAL 'P1D' * 2"
    );
  });

  it('should compile duration division (duration / n)', () => {
    const ast = parse('P2D / 2');
    assert.strictEqual(
      compileToJavaScript(ast),
      "dayjs.duration(dayjs.duration('P2D').asMilliseconds() / 2)"
    );
    assert.strictEqual(
      compileToRuby(ast),
      "ActiveSupport::Duration.parse('P2D') / 2"
    );
    assert.strictEqual(
      compileToSQL(ast),
      "INTERVAL 'P2D' / 2"
    );
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
      "dayjs('2024-01-15') < dayjs('2024-12-31')"
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
    assert.strictEqual(compileToJavaScript(ast), 'dayjs()');
  });

  it('should compile TODAY to JavaScript', () => {
    const ast = parse('TODAY');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('day')");
  });

  it('should compile TOMORROW to JavaScript', () => {
    const ast = parse('TOMORROW');
    // IR transforms TOMORROW to today() + P1D, emitted as dayjs method chain
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('day').add(dayjs.duration('P1D'))");
  });

  it('should compile YESTERDAY to JavaScript', () => {
    const ast = parse('YESTERDAY');
    // IR transforms YESTERDAY to today() - P1D, emitted as dayjs method chain
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('day').subtract(dayjs.duration('P1D'))");
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

describe('Temporal - Period Boundary Keywords', () => {
  // Day boundaries (SOD/EOD)
  it('should parse SOD keyword', () => {
    const ast = parse('SOD');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'SOD');
    }
  });

  it('should parse EOD keyword', () => {
    const ast = parse('EOD');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'EOD');
    }
  });

  it('should compile SOD to JavaScript', () => {
    const ast = parse('SOD');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('day')");
  });

  it('should compile EOD to JavaScript', () => {
    const ast = parse('EOD');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('day')");
  });

  it('should compile SOD to Ruby', () => {
    const ast = parse('SOD');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_day');
  });

  it('should compile EOD to Ruby', () => {
    const ast = parse('EOD');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_day');
  });

  it('should compile SOD to SQL', () => {
    const ast = parse('SOD');
    assert.strictEqual(compileToSQL(ast), "date_trunc('day', CURRENT_TIMESTAMP)");
  });

  it('should compile EOD to SQL', () => {
    const ast = parse('EOD');
    assert.strictEqual(compileToSQL(ast), "date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second'");
  });

  // Week boundaries (SOW/EOW)
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

  it('should compile SOW to JavaScript', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('isoWeek')");
  });

  it('should compile EOW to JavaScript', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('isoWeek')");
  });

  it('should compile SOW to Ruby', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_week');
  });

  it('should compile EOW to Ruby', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_week');
  });

  it('should compile SOW to SQL', () => {
    const ast = parse('SOW');
    assert.strictEqual(compileToSQL(ast), "date_trunc('week', CURRENT_DATE)");
  });

  it('should compile EOW to SQL', () => {
    const ast = parse('EOW');
    assert.strictEqual(compileToSQL(ast), "date_trunc('week', CURRENT_DATE) + INTERVAL '6 days'");
  });

  // Month boundaries (SOM/EOM)
  it('should parse SOM keyword', () => {
    const ast = parse('SOM');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'SOM');
    }
  });

  it('should parse EOM keyword', () => {
    const ast = parse('EOM');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'EOM');
    }
  });

  it('should compile SOM to JavaScript', () => {
    const ast = parse('SOM');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('month')");
  });

  it('should compile EOM to JavaScript', () => {
    const ast = parse('EOM');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('month')");
  });

  it('should compile SOM to Ruby', () => {
    const ast = parse('SOM');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_month');
  });

  it('should compile EOM to Ruby', () => {
    const ast = parse('EOM');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_month');
  });

  it('should compile SOM to SQL', () => {
    const ast = parse('SOM');
    assert.strictEqual(compileToSQL(ast), "date_trunc('month', CURRENT_DATE)");
  });

  it('should compile EOM to SQL', () => {
    const ast = parse('EOM');
    assert.strictEqual(compileToSQL(ast), "date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'");
  });

  // Quarter boundaries (SOQ/EOQ)
  it('should parse SOQ keyword', () => {
    const ast = parse('SOQ');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'SOQ');
    }
  });

  it('should parse EOQ keyword', () => {
    const ast = parse('EOQ');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'EOQ');
    }
  });

  it('should compile SOQ to JavaScript', () => {
    const ast = parse('SOQ');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('quarter')");
  });

  it('should compile EOQ to JavaScript', () => {
    const ast = parse('EOQ');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('quarter')");
  });

  it('should compile SOQ to Ruby', () => {
    const ast = parse('SOQ');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_quarter');
  });

  it('should compile EOQ to Ruby', () => {
    const ast = parse('EOQ');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_quarter');
  });

  it('should compile SOQ to SQL', () => {
    const ast = parse('SOQ');
    assert.strictEqual(compileToSQL(ast), "date_trunc('quarter', CURRENT_DATE)");
  });

  it('should compile EOQ to SQL', () => {
    const ast = parse('EOQ');
    assert.strictEqual(compileToSQL(ast), "date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day'");
  });

  // Year boundaries (SOY/EOY)
  it('should parse SOY keyword', () => {
    const ast = parse('SOY');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'SOY');
    }
  });

  it('should parse EOY keyword', () => {
    const ast = parse('EOY');
    assert.strictEqual(ast.type, 'temporal_keyword');
    if (ast.type === 'temporal_keyword') {
      assert.strictEqual(ast.keyword, 'EOY');
    }
  });

  it('should compile SOY to JavaScript', () => {
    const ast = parse('SOY');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().startOf('year')");
  });

  it('should compile EOY to JavaScript', () => {
    const ast = parse('EOY');
    assert.strictEqual(compileToJavaScript(ast), "dayjs().endOf('year')");
  });

  it('should compile SOY to Ruby', () => {
    const ast = parse('SOY');
    assert.strictEqual(compileToRuby(ast), 'Date.today.beginning_of_year');
  });

  it('should compile EOY to Ruby', () => {
    const ast = parse('EOY');
    assert.strictEqual(compileToRuby(ast), 'Date.today.end_of_year');
  });

  it('should compile SOY to SQL', () => {
    const ast = parse('SOY');
    assert.strictEqual(compileToSQL(ast), "date_trunc('year', CURRENT_DATE)");
  });

  it('should compile EOY to SQL', () => {
    const ast = parse('EOY');
    assert.strictEqual(compileToSQL(ast), "date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'");
  });

  // Expression tests
  it('should use period boundaries in expressions', () => {
    const ast = parse('SOM <= TODAY');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      if (ast.left.type === 'temporal_keyword') {
        assert.strictEqual(ast.left.keyword, 'SOM');
      }
    }
  });

  it('should compare period boundaries', () => {
    const ast = parse('SOY < EOY');
    assert.strictEqual(ast.type, 'binary');
    if (ast.type === 'binary') {
      assert.strictEqual(ast.operator, '<');
      assert.strictEqual(ast.left.type, 'temporal_keyword');
      assert.strictEqual(ast.right.type, 'temporal_keyword');
    }
  });
});

describe('Temporal - Invalid Duration Formats (missing T for time components)', () => {
  it('should not parse P2H - hours require T prefix', () => {
    // P2H is invalid ISO 8601 - time components require T prefix (PT2H)
    // Parser reads P2 as duration, then H becomes an unexpected identifier
    assert.throws(() => parse('P2H'), /Expected EOF but got (UPPER_)?IDENTIFIER/);
  });

  it('should not parse P30M - minutes require T prefix', () => {
    // P30M is ambiguous - M after P means months, not minutes
    // For 30 minutes, use PT30M
    const ast = parse('P30M');
    // This parses as 30 months, not 30 minutes
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P30M'); // 30 months
    }
  });

  it('should not parse P1H30M - hours require T prefix', () => {
    // P1H30M is invalid - should be PT1H30M
    assert.throws(() => parse('P1H30M'), /Expected EOF but got (UPPER_)?IDENTIFIER/);
  });

  it('should not parse P2H30M - hours require T prefix', () => {
    // P2H30M is invalid - should be PT2H30M
    assert.throws(() => parse('P2H30M'), /Expected EOF but got (UPPER_)?IDENTIFIER/);
  });

  it('should not parse P1S - seconds require T prefix', () => {
    // P1S is invalid - should be PT1S
    assert.throws(() => parse('P1S'), /Expected EOF but got (UPPER_)?IDENTIFIER/);
  });

  it('should parse PT2H correctly', () => {
    // Correct format with T prefix
    const ast = parse('PT2H');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'PT2H');
    }
  });

  it('should parse PT2H30M correctly', () => {
    // Correct format with T prefix
    const ast = parse('PT2H30M');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'PT2H30M');
    }
  });

  it('should parse P1DT2H correctly - days then time', () => {
    // Correct format: 1 day and 2 hours
    const ast = parse('P1DT2H');
    assert.strictEqual(ast.type, 'duration');
    if (ast.type === 'duration') {
      assert.strictEqual(ast.value, 'P1DT2H');
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
