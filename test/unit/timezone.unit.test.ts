import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertSafeTimezone } from '../../src/compilers/_validate';
import { compileToJavaScript } from '../../src/compilers/javascript';
import { compileToRuby } from '../../src/compilers/ruby';
import { compileToPython } from '../../src/compilers/python';
import { compileToSQL } from '../../src/compilers/sql';
import { parse } from '../../src/parser';

/**
 * The declared timezone (0259 D2) is the one compiler input that ends up inside
 * a string literal in all four emitted languages at once.
 *
 * CLAUDE.md's rule is that a value is never interpolated into target syntax.
 * Rather than reach for four different escapers, the zone goes through a
 * whitelist that admits no character any of them would have to escape — so
 * these tests are the whole of what makes the four `"${ctx.timezone}"`
 * emissions safe. If the whitelist widens, they are the review.
 */
describe('assertSafeTimezone', () => {
  it('accepts the zone names that exist', () => {
    for (const good of [
      'UTC',
      'Europe/Brussels',
      'America/Los_Angeles',
      'America/Argentina/Buenos_Aires',
      'Asia/Kathmandu',
      'Pacific/Chatham',
      'Etc/GMT+5',
      'Etc/GMT-14',
    ]) {
      assert.strictEqual(assertSafeTimezone(good), good);
    }
  });

  it('refuses a character a target would have to escape', () => {
    // Each of these is the escape that matters on one target: the single quote
    // closes a SQL string constant, the double quote a JS/Python/Ruby one, the
    // backslash escapes out of all of them, and `#` begins interpolation in a
    // Ruby double-quoted string — which is why JSON.stringify is never the
    // Ruby escaper (CLAUDE.md).
    for (const bad of [
      "UTC'",
      "UTC' || (SELECT 1) || '",
      'UTC"',
      'UTC\\',
      'UTC#{1}',
      'UTC#@ivar',
      'UTC#$gvar',
      'UTC\n',
      'UTC ',
      'UTC;DROP TABLE t',
      '${x}',
      '`x`',
    ]) {
      assert.throws(() => assertSafeTimezone(bad), /Invalid timezone/,
        `should have refused ${JSON.stringify(bad)}`);
    }
  });

  it('refuses what is simply not a zone name', () => {
    for (const bad of ['', ' ', 'Europe Brussels', '../etc/passwd', '/UTC',
                       'UTC/', '1Europe/Brussels', 'Europe//Brussels']) {
      assert.throws(() => assertSafeTimezone(bad), /Invalid timezone/,
        `should have refused ${JSON.stringify(bad)}`);
    }
  });

  it('refuses a non-string, since the AST API is in the threat model', () => {
    // CLAUDE.md: the threat model covers values arriving through the compiler
    // API, not only through the parser.
    for (const bad of [undefined, null, 0, {}, [], { toString: () => 'UTC' }]) {
      assert.throws(() => assertSafeTimezone(bad as unknown), /Invalid timezone/);
    }
  });
});

describe('the declared timezone reaches every target', () => {
  const ast = () => parse('NOW');

  it('is emitted as an argument to the clock helper, not inlined', () => {
    assert.match(compileToJavaScript(ast(), { timezone: 'Europe/Brussels' }),
      /kNow\("Europe\/Brussels"\)/);
    assert.match(compileToRuby(ast(), { timezone: 'Europe/Brussels' }),
      /k_now\("Europe\/Brussels"\)/);
    assert.match(compileToPython(ast(), { timezone: 'Europe/Brussels' }),
      /_elo_now\("Europe\/Brussels"\)/);
    assert.strictEqual(compileToSQL(ast(), { timezone: 'Europe/Brussels' }),
      "elo_now('Europe/Brussels')");
  });

  it('defaults to UTC on every target', () => {
    assert.match(compileToJavaScript(ast()), /kNow\("UTC"\)/);
    assert.match(compileToRuby(ast()), /k_now\("UTC"\)/);
    assert.match(compileToPython(ast()), /_elo_now\("UTC"\)/);
    assert.strictEqual(compileToSQL(ast()), "elo_now('UTC')");
  });

  it('refuses an unsafe zone on every target, at compile time', () => {
    for (const compile of [compileToJavaScript, compileToRuby, compileToPython, compileToSQL]) {
      assert.throws(() => compile(ast(), { timezone: "UTC' || x || '" }),
        /Invalid timezone/);
    }
  });

  /**
   * The emitters must not spell the conversion themselves. Only the helper
   * knows what a zone means, which is what keeps `$.timezone` (0261) from
   * being a refactor: the argument changes, the helper does not, and no
   * emission site does.
   */
  it('never names the zone outside a helper argument', () => {
    const zone = 'Pacific/Chatham';
    const src = parse('hour(NOW) + day(TODAY)');
    for (const [code, call] of [
      [compileToJavaScript(src, { timezone: zone }), `kNow("${zone}")`],
      [compileToRuby(src, { timezone: zone }), `k_now("${zone}")`],
      [compileToPython(src, { timezone: zone }), `_elo_now("${zone}")`],
    ] as const) {
      // Every mention of the zone is part of a clock-helper call, so stripping
      // those calls must leave no mention behind.
      const stripped = code.split(call).join('|').replace(
        new RegExp(`k_?[Tt]oday\\("${zone.replace('/', '\\/')}"\\)`, 'g'), '|')
        .replace(new RegExp(`_elo_today\\("${zone.replace('/', '\\/')}"\\)`, 'g'), '|');
      assert.ok(!stripped.includes(zone),
        `zone appears outside a clock-helper call: ${stripped}`);
    }
  });
});
