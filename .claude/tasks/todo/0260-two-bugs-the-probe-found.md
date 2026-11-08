# Two bugs the temporal probe found, neither about time

> **§2 is fixed** — `Date(datetime)` was the identity on Ruby because
> `DateTime` subclasses `Date`, so the coercion's `when Date` arm matched it and
> returned it with the time-of-day intact. Fixed by ordering
> `when DateTime, Time; v.to_date` first; measured red in all four zones and
> green in all four after. `to_date` went into the Ruby gate's
> `ALLOWED_METHODS` in the same commit, which is the review that gate exists to
> force.
>
> **§1 is still open**: the SQL emitter drops parentheses around a
> same-precedence right operand.

> Found while measuring the assertions for `todo/0259` on four targets under
> four host zones. Both are zone-independent, both are red under `TZ=UTC`, and
> neither needs any of `0259`'s decisions. Ordinary bug fixes.

## 1 — The SQL emitter drops parentheses it needs

Elo:

```elo
D2024-01-01T10:00:00 + (D2024-01-01T12:00:00 - D2024-01-01T10:00:00)
```

Emitted SQL:

```sql
TIMESTAMP '2024-01-01 10:00:00' + TIMESTAMP '2024-01-01 12:00:00' - TIMESTAMP '2024-01-01 10:00:00'
```

```
ERROR:  operator does not exist: timestamp with time zone + timestamp with time zone
```

The parenthesised right operand of a same-precedence operator is emitted
unparenthesised, so `a + (b - c)` becomes `(a + b) - c`. On numbers that is
value-preserving, which is why nothing has caught it:

```
1 + (2 - 1)   ->   1 + 2 - 1      # same answer, no complaint
```

On temporals it is a **type error**, because the regrouping asks PostgreSQL for
`timestamp + timestamp`. **SQL only** — the other three targets emit `kAdd` /
`k_add` / `kAdd` function calls, and a call preserves its own grouping.

So this is the shape CLAUDE.md names: a bug present on one target and absent on
three means the emissions have diverged. SQL is the one target that emits bare
infix operators, and it is the one that has to get precedence right.

**Red first:** the expression above, as an assert, in a fixture over temporal
values. It fails to *compile to runnable SQL*, which the SQL runner catches
only because `ON_ERROR_STOP` is set.

**Check while fixing:** whether the same dropped grouping is reachable for
`-`, `*` and `/`, and whether a nested duration case
(`D… + (PT3H - PT1H)` → `TIMESTAMP … + INTERVAL 'PT3H' - INTERVAL 'PT1H'`)
is merely lucky rather than correct. It currently gives the right answer by
left-associativity, which is not the same as being right.

## 2 — `Date(datetime)` on Ruby is the identity

```elo
let t = NOW in Date(t) == TODAY
```

Red on **Ruby in all four zones**, and red on **JS outside UTC**. Green on
Python and SQL.

The Ruby coercion emits:

```ruby
->(v) { case v when Date; v when String; ...; else raise ... end }.call(t)
```

In Ruby **`DateTime` is a subclass of `Date`** — measured,
`DateTime.ancestors.include?(Date)` is `true` — so the `when Date` arm matches
a `DateTime` and returns it **unchanged, time-of-day intact**. `Date(NOW)` is
therefore a no-op on Ruby, and comparing the result to `Date.today` is false.
Measured:

```
Date(NOW) returns: DateTime = Sun, 08 Nov 2026 11:52:21 +0000
== Date.today ? false
```

The `when Date` arm has to test for the *narrow* case, or truncate: `v.to_date`
when a `DateTime` arrives. Check the sibling coercions for the same subclass
trap — anywhere a Ruby `case/when` guard uses `Date`, a `DateTime` will slip
through it.

The JS half of this line is a different cause (the host-zone `TODAY`) and is
fixed by `0259` step 1; the Ruby half is this bug and is fixed independently.
Both must be green before `0259`'s fixture can include the line.
