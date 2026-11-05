# What the formula catalogue asked for and did not get

> The other half of 226. Thirteen real formulas got written; these are the ones
> that did not, and the detours the ones that did had to take. Each is a
> proposal, not a decision — and several should probably be refused, since the
> design principles put simplicity above powerfulness.

## 1. A weekday. `dayOfWeek`, or `isWeekend`

The formula missing from the catalogue is **business days**: "this ticket is due
in three working days", "this invoice is late by seven business days". It is
one of the most common things a no-code tool computes, and Elo cannot express
it: there is `year`, `month`, `day`, `hour`, `minute`, and no way to ask which
day of the week a date falls on.

The workaround is arithmetic on a known Monday, which nobody would write twice:

```elo
inDays(d - D2024-01-01) % 7 == 0   # a Monday, because 1 January 2024 was one
```

Proposal: `dayOfWeek(Date|Datetime) → Int`, 1 for Monday to 7 for Sunday (ISO
8601, which is also what Luxon's `weekday`, Ruby's `cwday` and PostgreSQL's
`ISODOW` give — the one numbering all four targets already agree on, where
`getDay()`/`wday`/`DOW` put Sunday at 0). `isWeekend` reads better at the call
site but is a judgement about a calendar, not a fact about a date — Saturday is
a working day in several places — so `dayOfWeek` is the honest primitive.

A `businessDaysBetween` or a `+ 3 business days` is the thing people actually
want, and it is the thing to refuse: it needs a holiday calendar, which is
data, and data belongs in the input.

## 2. An index inside `map` and `reduce`

The Luhn checksum doubles *every second* digit, so it needs to know where it
is. Elo's `reduce` carries only an accumulator, so the position has to be
smuggled through it:

```elo
reduce(reverse(split(bare, '')), { at: 0, sum: 0 }, fn( acc, c ~>
  { at: acc.at + 1, sum: acc.sum + (if acc.at % 2 == 1 then doubled else d) }
))
```

That works — `card-number.elo` ships it — but half of it is bookkeeping, and
anyone writing a positional digit algorithm (ISBN-10's weights, a mod-11
checksum, alternating signs) writes the same bookkeeping again.

Three ways out, in increasing order of what they cost the language:

- **`range(n) → [Int]`**, and `map(range(count(xs)), …)` with `at(xs, i)`.
  One function, no new shape, and it also gives the "repeat this n times" that
  nothing else in Elo offers. It makes an unbounded list cheap to build, so it
  needs the same length bound strings already have.
- **An optional second lambda parameter**: `map(xs, fn( x, i ~> … ))`, as
  JavaScript, Ruby and Python all allow. No new function, but arity becomes
  overloaded per call site, which the signature table and the checker would
  both have to learn.
- **`mapWithIndex` / `reduceWithIndex`**: explicit, and two more names for
  something that is one idea.

`range` looks like the one: smallest surface, and useful beyond this.

## 3. A coercion that answers null instead of raising

Every validator in the catalogue checks the characters *before* converting
them, because `Int('12x')` raises and there is no way to catch it:

```elo
valid = if isAllDigits(digits) then Int(substring(digits, 0, 8)) % 97 == … else false
```

A non-raising variant would compose with the `|` operator Elo already has:

```elo
Int?('12x') | 0        # or toInt('12x') | 0
isNull(Int?(input.n))  # "is this a number at all"
```

This is the one proposal to weigh against the design principles rather than
for. `Int?` is a second way to spell a conversion, and two spellings of one
idea is what the "simple, well-designed" ordering exists to prevent. The
counter-argument is that *validating* input is the single most common thing a
published formula does, and today it is only expressible by reimplementing the
parser (`isAllDigits` by hand, per formula). A `guard`-free, raise-free way to
ask "would this coerce?" is a real gap. Perhaps the answer is not `Int?` but
`isInt(String) → Bool`, which adds no new coercion semantics at all.

## 4. `ord`, the other half of `chr`

`chr(Int) → String` exists; nothing goes the other way. The IBAN formula needs
a letter's alphabet position and gets it from
`indexOf('ABCDEFGHIJKLMNOPQRSTUVWXYZ', c)`, which is a 26-character literal
standing in for a missing function. `ord(String) → Int` is the inverse of a
function that is already there, which makes it hard to argue against — though
it does invite the question of what it answers for a multi-character string, or
for an empty one (null, presumably, as `indexOf` does).

## 5. `count(list, predicate)`

`count(filter(xs, p))` is what `password-strength.elo` writes, twice. Not a
gap — it is perfectly readable — but `sum` already takes an optional second
argument, so the precedent for "the common case as an extra argument" exists.
Low value, listed for completeness.

## 6. Chunking a string

`groupsOfFour` in `iban.elo` formats an IBAN by folding character by character
and inserting a space every fifth position:

```elo
reduce(split(s, ''), '', fn( acc, c ~> acc + (if length(acc) % 5 == 4 then ' ' else '') + c ))
```

It is clever, which in a formula people are meant to read is a defect. Formatting
a number in groups — IBANs, card numbers, phone numbers, thousands separators —
is common enough that it may deserve a `chunk(String, Int) → [String]` (then
`join(chunk(s, 4), ' ')`). This is the proposal with the least evidence behind
it: one formula wanted it.

## What is deliberately not here

No request for exceptions, loops, local mutation, user-defined recursion, or a
regular-expression type. Thirteen formulas, including three checksum
validators, a tax table and four date calculations, needed none of them. The
language is the right size; it is missing a weekday and an index.
