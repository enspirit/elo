# Four answers to a date function on a string, and the check that knew better

> The smaller thing found alongside 0216, which that task deliberately did not
> fold in. 0216 was about a wrong *value* ; this one is about one call having
> four different answers depending on the target.

## Decided

`startOfMonth(String)` must raise a **"no signature" error**. Not coercion:
`startOfMonth` wants a Date or a DateTime, a String is not one, and the author
writes `startOfMonth(Date(_.d))` if that is what they meant. Coercion is the
kind of powerfulness the design principles say to restrict — it is what makes
Ruby quietly accept `startOfMonth([1])` as well.

## Symptom

```elo
startOfMonth('2026-03-15')
```

| Target | What happens today |
| --- | --- |
| JavaScript | refused: `No signature of startOfMonth accepts startOfMonth(String). Known: startOfMonth(Date), startOfMonth(Datetime)` |
| Python | refused, same message |
| SQL | refused, same message |
| **Ruby** | **compiles**, to `"2026-03-15".to_datetime.beginning_of_month` |

So the wanted error already exists, with the wanted wording. It just does not
fire on all four targets.

## Why Ruby is the odd one out

`src/bindings/ruby.ts:85` registers the whole period-boundary family on
`[Types.any]`:

```ts
rubyLib.register(fn, [Types.any], (args, ctx) => `${ctx.emit(args[0])}.to_datetime.${method}`);
```

That registration is load-bearing and should stay — the comment above it
explains why an unknown type must not fall back to the Datetime emission. The
problem is where the check lives. `StdLib.lookup` generalizes concrete types to
`any` (`src/stdlib.ts:135`), so `String` finds the `any` implementation, and the
"No signature" error at `src/stdlib.ts:179` only ever fires when *no* binding
on that target happened to register something permissive. The refusal is an
accident of each target's bindings, not a property of the language.

The same hole is open elsewhere, so this is not a `startOfMonth` patch:

| | Ruby | JavaScript |
| --- | --- | --- |
| `round('x')` | `"x".round` | `kRound('x')` |
| `floor(true)` | `true.floor` | `Math.floor(true)` |
| `ceil([1])` | `[1].ceil` | `Math.ceil([1])` |
| `startOfMonth([1])` | `[1].to_datetime.beginning_of_month` | refused |

## What it should be

The signature check belongs to the language, and the language already has it.
`src/typecheck.ts:722` reports `no-matching-signature` against the one
signature table in `src/typedefs.ts`, above every target binding, and it gets
every case above right:

```
$ eloc --typecheck -t ruby -e "startOfMonth('2026-03-15')"
1:1: error: No signature of startOfMonth accepts startOfMonth(String). Known: startOfMonth(Date), startOfMonth(Datetime) [no-matching-signature]
$ echo $?
1
```

The defect is that this is opt-in behind `--typecheck`. A call whose argument
types are known and match no declared signature should be refused on every
compile, on every target. `StdLib`'s own error then becomes a backstop for a
binding that is missing an implementation the table declares — a compiler bug,
not an author's mistake — rather than the thing the author relies on.

Out of scope, and should stay opt-in: `startOfMonth(_.d)` where `_.d` is `any`.
The checker already has the right answer there too — `startOfMonth needs a
known argument type, got Any`, with the hint to coerce through a declared type
— but that is `unresolved-any` under `--strict`, which is a separate decision
about how much Elo demands to be typed.

## Blast radius

None on the corpus: all 124 fixtures already pass `--typecheck` on Ruby.

```
$ for f in $(find test/fixtures -name '*.elo' -not -path '*/modules/*'); do
    eloc --typecheck --lines -t ruby "$f" >/dev/null 2>&1 || echo "$f"; done
$    # (no output)
```

## Tests

A refusal assertion, not a value one — the program must fail to *compile*, on
every target, with `no-matching-signature`. Seen red on Ruby first, where it
compiles today.

- `startOfMonth('2026-03-15')` — the case this task is named for
- `startOfMonth([1])`, `round('x')`, `floor(true)` — the same hole on other
  functions, red on Ruby and JavaScript
- a declared input: `let Row = { d: String } in startOfMonth((_ |> Row).d)`,
  which is where a real program meets this
- and, still green, `startOfMonth(_.d)` undeclared, to pin that this task did
  not quietly turn `any` into an error

Integration tests over the four targets are the natural level, since the
refusal is now a compile-time one. See `test/unit/typecheck.unit.test.ts` for
the `no-matching-signature` cases already pinned there.
