## Problem to solve

There is no way to write a character by its code point.

```elo
chr(160)             # Unknown function chr(Int)
length('a\u00A0b')   # 8 — the escape is eight literal characters
```

A non-breaking space can only travel as itself, inside the source. It is
invisible in review, survives no copy-paste, and is lost in silence.

## Context

Reported by Bricks (point 8), in production. Verified against main on
2026-10-31: string literals interpret `\\`, `\n`, `\t`, `\r` and `\'`, and
nothing else.

## Proposal

Two candidates, not exclusive:

- **`chr(n)`** — a stdlib function, no lexer change, trivially portable
  (`String.fromCharCode`, `.chr`, `chr`, `CHR`). Smallest possible change.
- **`\u{...}` in string literals** — reads better at the point of use
  (`'a\u{00A0}b'`) but touches the lexer and the escape rules in four
  emitters, where the 1.0.1 security work already found sharp edges around
  string escaping.

`chr` first; the escape only if the ergonomics turn out to matter.

## Work

Four targets, fixtures, README and the stdlib page.
