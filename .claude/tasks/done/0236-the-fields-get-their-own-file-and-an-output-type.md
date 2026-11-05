# The fields get their own file, and an Output type

> **Superseded in part.** The format landed over three passes — 0233, 0236
> and 0237 — and what it finally is lives in `examples/formulas/BUNDLE.md`.
> This file is the pass, not the format.

> On 0233's bundle format, straight away:
>
> "I think the field definitions should be in their own .elo file ; and I think
> we should support an Output type."

Both, and they turn out to be the same change: the bundle's **data** is a thing
of its own, and it has two halves.

## What changed

```
iban/
  types.elo       # Input and Output          ← new
  formula.elo     # the doc comment and { formula: … }   ← no longer declares Input
  cases.elo
  bundle.json
```

`types.elo` is an ordinary Elo module — a type prelude and no expression, which
is a valid file — so the generated runner and the service expression import it
by name:

```elo
import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
```

## Why the split is more than tidiness

- A catalogue building a form, or a client generating a type, now reads **one
  small file** and never parses the formula. That was already true of the
  derivation; it is now true of the file layout, which is what makes a bundle
  readable by something that is not an Elo host.
- Two formulas can **share a schema** without one importing the other's code —
  `import { Money } from '../shared/types'` is an ordinary import, where
  importing it from a `formula.elo` would have dragged the formula in with it.
- `formula.elo` names no type at all now. It takes a value that has already
  been through `Input` and answers one about to go through `Output`, which is
  what "coercion is the caller's job" was already saying.

## Why `Output` is applied, not just declared

`|> Output` is in the runner and in the service expression for the same reason
`|> Input` is: **a declared type that is never applied is a comment.** Three
things fell out of applying it:

1. **The answer's shape is checked on every target.** Declaring `daysLeft: Int`
   for payment-due-date — `inDays` answers a Float — fails on Ruby and Python
   and passes on JavaScript, which has one number type. Tried it, watched two
   targets go red, put the `Float` back. No other check in the suite would have
   caught that declaration.
2. **Nullability gets written down.** `iban` answers `country: String|Null`
   because an invalid IBAN has no country; the cases only implied it, and the
   type says it. A catalogue reads that as "render a dash, not an error".
3. **The manifest's `output` labels became checkable.** They key on a field of
   `Output`, so the lint refuses a typo — which it could not do when the
   answer's keys existed only at run time.

A scalar answer is a type too: `leap-year` declares `Output = Bool`, and the
derivation gives it one field named `value`, labelled from the manifest like
any other.

## What it cost

One walk now serves both halves — `describeFields` replaces `describeInput`,
since a column of an answer is a field with a label and a type, exactly like a
form field. `required` reads as "the type does not accept null" on that side.

The thirteen bundles were split mechanically (the type prelude moved out of
`formula.elo` verbatim) and each gained an `Output` written by hand from what
its cases answer. The lint, the demo page and the tests follow; the integration
suite has 108 tests over the format now, including the four new refusals (no
`Output`, no `types.elo`, an `output` label naming nothing, and `Input` renamed).

## Still open

The three questions 0233 left are unchanged — `options` is still the one thing
stated twice (`ideation/0235`), the reader is still an example rather than a
package entry point, and nothing yet shares a module between bundles. The
second of those gets a little more pressing now: `types.elo` is the file a
non-Elo client most wants to read, and reading it means `loadProgram` plus the
AST, which is the protected tier.
