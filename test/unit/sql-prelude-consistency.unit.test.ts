import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getPrelude } from '../../src/preludes';

/**
 * Consistency between the SQL emitters and the SQL prelude.
 *
 * The SQL compiler calls PL/pgSQL helpers — `elo_int`, `elo_patch`,
 * `elo_deep_merge`, … — that no pure SQL expression can define. They used to
 * live only in `docker/init.sql`, a dev-environment file: a host compiling Elo
 * to SQL had no way to obtain them from the compiler, and nothing checked that
 * the file and the emitters agreed. A helper called by a binding with no
 * definition installed is an `undefined function` at query time.
 *
 * `src/bindings/sql.ts` is the only place SQL helper calls are produced, so a
 * scan of its emitter strings against the prelude's `FUNCTION elo_…` names
 * pins both directions.
 */

/** Repo root, whether this test runs from `dist/test/unit` or `test/unit`. */
function repoRoot(): string {
  let dir = __dirname;
  while (!existsSync(join(dir, 'package.json'))) {
    const up = dirname(dir);
    if (up === dir) throw new Error('could not locate the repository root');
    dir = up;
  }
  return dir;
}

const SQL_BINDINGS = readFileSync(
  join(repoRoot(), 'src/bindings/sql.ts'),
  'utf-8'
);

/** Helper names the emitters can produce, as `elo_name(` call sites. */
function emittedHelpers(): Set<string> {
  const names = new Set<string>();
  for (const match of SQL_BINDINGS.matchAll(/\belo_([a-z_]+)\s*\(/g)) {
    names.add(`elo_${match[1]}`);
  }
  return names;
}

/** Helper names the prelude defines, whatever their overloads. */
function definedHelpers(): Set<string> {
  const names = new Set<string>();
  for (const match of getPrelude('sql').matchAll(
    /CREATE OR REPLACE FUNCTION\s+(elo_[a-z_]+)\s*\(/g
  )) {
    names.add(match[1]);
  }
  return names;
}

describe('SQL prelude consistency', () => {
  it('defines runtime helpers at all', () => {
    // The prelude used to say "-- No prelude needed for SQL", which was false.
    const defined = definedHelpers();
    assert.ok(
      defined.size > 0,
      'getPrelude("sql") defines no elo_* helper, yet the SQL emitters call them'
    );
  });

  it('defines every helper the SQL emitters can call', () => {
    const defined = definedHelpers();
    const missing = [...emittedHelpers()].filter(n => !defined.has(n)).sort();
    assert.deepStrictEqual(
      missing,
      [],
      'src/bindings/sql.ts emits calls to helpers the SQL prelude does not ' +
      'define; they would be "undefined function" at query time. Define them ' +
      'in src/preludes/sql.ts.'
    );
  });

  it('defines no helper no emitter can call', () => {
    // A helper nothing emits is dead weight every host has to install.
    // Recursive helpers call themselves, so the emitter scan is not the whole
    // story: a name used inside the prelude itself counts as reachable.
    const emitted = emittedHelpers();
    const dead = [...definedHelpers()]
      .filter(n => !emitted.has(n))
      .sort();
    assert.deepStrictEqual(
      dead,
      [],
      'the SQL prelude defines helpers no emitter in src/bindings/sql.ts can ' +
      'call; drop them.'
    );
  });
});
