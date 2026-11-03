# Four answers to a date function applied to a string

> The smaller thing found alongside 0216, which that task deliberately did not
> fold in. 0216 was about a wrong *value* ; this one is about four different
> refusals for one call.

## Symptom

```elo
startOfMonth(_.d)        # with _.d = "2026-03-15", a String
```

| Target | What happens |
| --- | --- |
| Ruby | succeeds — `2026-03-01T00:00:00+00:00`, coercing the string |
| JavaScript | `TypeError: _.d.startOf is not a function` |
| Python | `TypeError: replace() takes at most 3 keyword arguments (5 given)` |
| SQL | `ERROR: function date_trunc(unknown, text) does not exist` |

Four behaviours for one call, and three of the four are internal errors from
inside the prelude rather than a refusal naming the argument. The Python one is
the worst: nothing in `replace() takes at most 3 keyword arguments` tells the
reader that `_.d` was a string where a date was wanted.

Nothing in the compiler refuses it either — with no declared input type, `_.d`
is `any`, so the call type-checks and the failure is deferred to runtime on
whichever target happens to run it.

## The real question

Which of the four is correct? Two defensible answers, and the choice belongs to
the language rather than to each target's prelude:

1. **Refuse it.** `startOfMonth` wants a Date or a DateTime ; a String is not
   one, and the diagnostic should say so, naming the argument and its type.
   Coercion is the kind of powerfulness the design principles say to restrict:
   it is what makes Ruby silently accept `"not a date"`-shaped input too.
2. **Coerce it**, as Ruby does, on every target — an ISO string is a date in
   every practical sense, and `Date(_.d)` is noise the author should not have
   to write.

Either way it must be the same on four targets, and the failure must be a
refusal that names the argument, not a `TypeError` escaping the prelude.

Worth checking the whole temporal family while in here — `startOfDay`,
`endOfMonth`, `year`, `month`, `day` — not just `startOfMonth`. The same
question applies to every function whose argument the compiler cannot type
statically, so the answer is probably one mechanism rather than one patch per
function.

## Tests

Not a value assertion — a *refusal* assertion. See `test/acceptance/failures`
and `test/acceptance/test-failures.sh` for the existing shape: a program that
must fail, and the structure the failure must have on every target.

If the answer is (1), the test is that a declared `_ : {d: String}` is refused
at compile time, and that an undeclared one fails identically on the four
targets at runtime. If it is (2), the test is that the four agree on
`2026-03-01`, plus a refusal assertion for a string that is not a date at all.
