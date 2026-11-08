import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

/**
 * The inbound boundary under a *declared* zone (0259 D7).
 *
 * `test/fixtures/stdlib/datetime/inbound-boundary.elo` asserts the same rule,
 * but the corpus compiles with the default zone and the acceptance runners have
 * no way to pass `--timezone`. One zone cannot show that the declared zone is
 * what decides — under UTC alone, "expressed in the declared zone" and
 * "converted to UTC" are indistinguishable. So the pair matters: the fixture
 * pins the default, and this pins that the flag is what moves the answer.
 *
 * Runs on JavaScript only, because that is the target this process can execute.
 * The other three are covered by the emission assertions below plus the
 * fixture; all four were measured agreeing cell for cell when this landed.
 */
describe('the inbound boundary reads an instant in the declared zone', () => {
  const evaluate = (expr: string, tz: string): string =>
    execSync(`./bin/elo --timezone ${tz} -e ${JSON.stringify(expr)}`, {
      encoding: 'utf8',
    }).trim();

  // `hour(Datetime(s))`, by datum and by declared zone. The rows that differ
  // between the two columns are the whole point: the same expression over the
  // same datum answers differently because the declared zone differs.
  const CASES: Array<[string, string, string]> = [
    // datum                        UTC    Europe/Brussels
    ['2026-01-15T10:00:00',         '10',  '10'],  // no offset: left where it is
    ['2026-01-15T10:00:00Z',        '10',  '11'],  // 10:00Z is 11:00 in Brussels
    ['2026-01-15T10:00:00+00:00',   '10',  '11'],
    ['2026-01-15T10:00:00+01:00',   '9',   '10'],  // Brussels *is* +01:00 in January
    ['2026-07-15T10:00:00+02:00',   '8',   '10'],  // and +02:00 in July
    ['2026-01-15T10:00:00+05:30',   '4',   '5'],
    ['2026-01-15T10:00:00-05:00',   '15',  '16'],
  ];

  for (const [datum, utc, brussels] of CASES) {
    it(`reads ${datum} as ${utc} in UTC and ${brussels} in Brussels`, () => {
      const expr = `hour(Datetime('${datum}'))`;
      assert.strictEqual(evaluate(expr, 'UTC'), utc);
      assert.strictEqual(evaluate(expr, 'Europe/Brussels'), brussels);
    });
  }

  it('leaves an offsetless datum alone whatever the declared zone', () => {
    // The one row that must *not* move: a datum with no offset is already a
    // wall clock in the declared zone, so there is nothing to express.
    for (const tz of ['UTC', 'Europe/Brussels', 'Pacific/Chatham', 'Asia/Kathmandu']) {
      assert.strictEqual(evaluate("hour(Datetime('2026-01-15T10:00:00'))", tz), '10');
      assert.strictEqual(evaluate("day(Date('2026-01-15'))", tz), '15');
    }
  });

  it('is the same rule NOW follows, so the two agree on a zone-free value', () => {
    // Round-tripping TODAY through the boundary cannot move it: TODAY is
    // already a wall clock in the declared zone.
    for (const tz of ['UTC', 'Europe/Brussels', 'Pacific/Chatham']) {
      assert.strictEqual(evaluate('Date(TODAY) == TODAY', tz), 'true');
    }
  });
});

describe('every target names the declared zone at the inbound boundary', () => {
  const compile = (expr: string, target: string, tz: string): string =>
    execSync(`./bin/eloc -t ${target} --timezone ${tz} -e ${JSON.stringify(expr)}`, {
      encoding: 'utf8',
    }).trim();

  // The emission must carry the zone to the coercion, on all four targets --
  // the half of D7 this process cannot execute for Ruby, Python and SQL.
  const EXPECTED: Array<[string, RegExp]> = [
    ['js', /pDatetime\("2026-01-15T10:00:00\+01:00", '', "Europe\/Brussels"\)/],
    ['ruby', /k_wall\(s, "Europe\/Brussels"\)/],
    ['python', /kParseDatetime\("2026-01-15T10:00:00\+01:00", "Europe\/Brussels"\)/],
    ['sql', /elo_datetime\('2026-01-15T10:00:00\+01:00', 'Europe\/Brussels'\)/],
  ];

  for (const [target, pattern] of EXPECTED) {
    it(`passes the zone to the ${target} coercion`, () => {
      const code = compile("Datetime('2026-01-15T10:00:00+01:00')", target, 'Europe/Brussels');
      assert.match(code, pattern);
    });
  }

  it('threads the zone into a schema field parser too', () => {
    // pSchema takes parsers by reference under a (value, path) contract, so a
    // temporal field gets the curried form rather than the bare parser. If
    // this regresses, a Datetime inside `_ |> S` would silently read UTC while
    // `Datetime(_.t)` read the declared zone.
    const src = 'let S = { at: Datetime } in _ |> S';
    assert.match(compile(src, 'js', 'Europe/Brussels'), /pDatetimeIn\("Europe\/Brussels"\)/);
    assert.match(compile(src, 'ruby', 'Europe/Brussels'), /p_datetime_in\("Europe\/Brussels"\)/);
    assert.match(compile(src, 'python', 'Europe/Brussels'), /pDatetimeIn\("Europe\/Brussels"\)/);
  });
});
