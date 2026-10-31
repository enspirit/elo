## Problem to solve

`String()` is doing two jobs, and the collision produces wrong values.

```elo
String(D2026-09-16)            # "D2026-09-16T00:00:00"
String(D2026-09-16T10:30:00Z)  # "D2026-09-16T12:30:00"
String([1, 2])                 # "[1, 2]"
String(2.5 + 0.5)              # "3" in JS, "3.0" in Ruby and Python
```

The date renders as an **Elo literal**, prefix included — a Date even becomes
a DateTime, and the instant is silently shifted to local time. The list
renders as Elo syntax, deliberately. The float disagrees between targets.

`kString` is a serialiser to Elo source. `String()` is reached for as a text
conversion. Both readings are reasonable; only one can be right.

## Context

Reported by Bricks (point 5), who trace their second lost day to it: the `D`
prefix in a composed string is what sent them into `substring` (see 0154).
Verified against main on 2026-10-31.

The float divergence is separately known: it is the one assertion left out of
`test/fixtures/reference/selectors-precedence.elo` during 1.1.0, for the same
undecided reason.

## Proposal

Split the two jobs.

- `String(x)` becomes text conversion: dates ISO without the prefix, no
  timezone shift, floats without a trailing `.0`, and the four targets agree.
- Elo-source rendering stays available through `toEloCode`, exposed
  in-language if it is wanted.

Deciding this settles the date prefix, the timezone shift and the float
divergence in one move.

## To decide

- What does `String([1, 2])` become under text conversion? `"1, 2"`? `"[1, 2]"`
  without quoting the elements? This is the part that has no obvious answer.
- Breaking change for anyone relying on the current rendering. 2 007
  expressions in production at Bricks alone — worth asking them to grep.
