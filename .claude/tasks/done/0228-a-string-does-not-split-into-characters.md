# A string does not split into characters on two targets out of four

> Found while building the formula catalogue of 226. Every checksum — IBAN
> mod-97, Luhn, ISBN — walks a string one character at a time, and
> `split(s, '')` is the only way Elo has to do that.

## Symptom

```elo
split('abc', '')
```

| Target | What happens today |
| --- | --- |
| JavaScript | `['a', 'b', 'c']` |
| Ruby | `['a', 'b', 'c']` |
| **Python** | **raises** `ValueError: empty separator` |
| **PostgreSQL** | **`['abc']`** — the whole string, silently |

PostgreSQL is the worse half: nothing raises, the list just has one element
instead of sixteen.

## Why

- Python's `str.split` refuses an empty separator outright; the `kSplit` helper
  in `src/runtime.ts` passed it straight through. `list(s)` is the idiom.
- `string_to_array(v, '')` answers `{v}`. `regexp_split_to_array(v, '')` does
  split into characters, but it answers `{""}` for an empty subject where every
  target (and the `split('', ',')` fixture) answers `[]`. So neither builtin
  alone is the function, and `split` is emitted from
  `src/bindings/sql.ts` as whichever one it names.

## Fix

- Python: `if sep == '': return list(s)` in `kSplit`, before the `str.split`.
- PostgreSQL: a new `elo_split(TEXT, TEXT)` prelude helper that picks between
  the two builtins, and returns `ARRAY[]::TEXT[]` for an empty subject. `split`
  now always emits `elo_split`, so there is one definition of what the function
  means rather than a branch in the emitter.

`elo_split` is the eleventh `elo_*` name, which is public interface: a host
installs the prelude in its database, and must reinstall it for `split` to keep
working. README and the reference page say eleven now.

## Tests

`test/fixtures/stdlib/string/transform/split.elo`, red first: **Python 3
failing lines** (`split('abc','')`, `split('9','')`, and the 16-character IBAN
count), **PostgreSQL 2 failing assertions**, Ruby and JavaScript green.
`split('', '')` was already green everywhere — `kSplit` returns `[]` for an
empty subject before it ever looks at the separator, which is exactly what hid
the Python case from a smaller assertion.

No fixture reaches `split` with a separator the compiler cannot type: that
needs a lambda, and the file has a SQL expectation. The SQL helper handles it
anyway, since the choice is made at run time rather than in the emitter.
