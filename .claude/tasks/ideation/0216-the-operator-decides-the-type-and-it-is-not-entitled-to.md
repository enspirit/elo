# The operator decides the type, and it is not entitled to

## Symptom

Where SQL has two operands whose types nothing knows, it reads the type off the
**operator**:

```ts
const OPERATOR_DEMAND: Partial<Record<string, string>> = {
  '+': 'numeric', '-': 'numeric', '*': 'numeric', '/': 'numeric', '%': 'numeric',
  '<': 'numeric', '>': 'numeric', '<=': 'numeric', '>=': 'numeric',
  'AND': 'boolean', 'OR': 'boolean',
};
```
— `src/bindings/sql.ts`

Its comment says *"Only the operators whose reading is unambiguous are here."*
That is not true of six of the eleven. In Elo `+` is also string concatenation,
and `<` `>` `<=` `>=` are also string ordering:

```elo
'x' + 'y'      # 'xy'
'a' < 'b'      # true
```

So when both operands are field reads of unknown type, SQL casts strings to
`numeric`:

```
$ eloc -t sql -e "Data(_).a + Data(_).b"
((elo_data($1)->>'a'))::numeric + ((elo_data($1)->>'b'))::numeric
```

Given `{"a": "x", "b": "y"}` that is `ERROR: invalid input syntax for type
numeric: "x"`, where the other three targets answer `'xy'`.

## Why it is narrow now

Before 0214 this fired 8 times over the fixture corpus, including on the
expression `{a: 'x'}.a + {b: 'y'}.b`. 0214 gave `EloType` field types, so a
read off a known shape now knows what it produces and the table is not
consulted at all: **0 times over the corpus**, measured.

What is left is the case where the shape is genuinely unknown — a `jsonb` value
from `Data`, `fetch`, `merge` or `patch`, whose field types nothing declares:

```elo
Data(_).a + Data(_).b          # reachable
merge({}, _).a < merge({}, _).b  # reachable
{ a: 'x' }.a + { b: 'y' }.b    # no longer: the shapes are known
```

So this is a pre-existing bug that 0214 made rare rather than one it
introduced. It is recorded separately because fixing it needs a *decision*,
which 0214 did not need.

## The three answers, none of them free

1. **Keep guessing, but only where the guess is sound.** Drop `+` and the four
   comparisons, keep `-` `*` `/` `%` (numeric-only in Elo) and `AND`/`OR`
   (boolean-only). Then `Data(_).a + Data(_).b` emits `text + text`, which
   PostgreSQL refuses — *"operator does not exist: text + text"*. A loud
   failure instead of a wrong answer, at plan time rather than on the data.
   Small, and strictly better than today, but it turns a working-for-numbers
   expression into an error.
2. **Refuse at compile time.** `+` on two values SQL cannot type has no SQL, so
   say so, as the compiler already does for a list mixing types and for a
   ragged list of lists. The most Elo-ish answer — the design order puts
   portable above powerful, and a refusal the author can read beats a cast that
   is wrong on some data. Needs a message that says what to do instead
   (declare the shape, or coerce: `Int(d.a) + Int(d.b)`).
3. **Emit a runtime dispatcher.** `elo_add(text, text)` deciding numerically or
   textually per value, as `kAdd` does on JavaScript. Matches the other targets
   exactly, and is the only answer that makes the expression *work*. Costs a
   prelude function per ambiguous operator and gives up on static typing where
   Elo has nothing to type.

(1) and (2) are honest; (3) is portable. (2) is probably right, and (1) is a
sound stepping stone to it.

## Tests

`test/fixtures/reference/object-member-types.elo` already pins the fixed half —
`{a: 'x', b: 'y'}.a + {a: 'x', b: 'y'}.b == 'xy'` runs on all four targets.
The unfixed half needs its own assertion over an untyped `jsonb` value, which
means a fixture that feeds `_` rather than writing its data in place; see how
`stdlib/data/` does it.

Whichever answer wins, the `OPERATOR_DEMAND` comment should stop claiming the
operators are unambiguous.

## Relation to other tasks

- **0214** gave the compiler field types, which is what made this narrow. Its
  remaining steps (collapsing `CheckType` into `EloType`) would narrow it
  further but not close it: a `jsonb` value's fields are unknown to the checker
  too.
- **0205** is the same family — the SQL binding not knowing the type of what it
  holds.
