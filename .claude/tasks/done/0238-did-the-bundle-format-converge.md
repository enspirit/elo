# Did the bundle format converge?

> "Kept bug fixes to main, moved the rest to a dedicated branch. Let's clean it
> already and see whether we converged on something we can explain /
> document / live-with."

Cleaned, and the answer is **yes, with one wart and one thing I would still
drop**. The format is `examples/formulas/BUNDLE.md`; this is the review of it.

## What the clean-up found

Four things, three of them in code nobody had read twice, and one of them
serious:

- **`--fields x > x/fields.elo` destroyed the file.** The documented refresh
  workflow redirected into the file the generator reads the hand-written
  labels out of — and a shell opens a redirect *before* the command runs, so
  the generator read an empty file, failed to parse it, and left the bundle
  with no form at all. Found by asking what it is like to live with, not by any
  test. `--fields` now **writes the file itself**, which also lets it bootstrap
  a bundle that has none yet. Three tests cover it, one of them the exact case
  that broke.
- **`inputType()` re-parsed `types.elo` on every call**, from the generator and
  the lint both. The declared types are now parsed once in `loadBundle` and
  carried on the `Bundle`.
- **A dead line**: the generator's "a choice defaults to a select" could never
  fire, because the only source of `options` is a file that always also carries
  a widget.
- **`checkOptions` only looked at top-level fields**, so a nested choice field
  would have been skipped in silence. It reads a path → declared-type map now,
  which is the same walk `describeFields` does.

Plus the paper trail: `0226`, `0233` and `0236` describe layouts the format has
since moved past, and each now says so in a line at the top. `CLAUDE.md` gained
the catalogue as a component, with the refresh command, because the next
session will otherwise hand-edit a generated file.

## Does it explain?

One rule does the whole job: **nothing may be stated twice unchecked.** Every
file follows from it, and `BUNDLE.md` opens with the table that answers the only
question a reader has:

| File | Written by | Held to |
| --- | --- | --- |
| `types.elo` | hand | the cases, running on three targets |
| `formula.elo` | hand | the cases |
| `fields.elo` | generated, then labelled | `Input`, key by key |
| `cases.elo` | hand | the formula, running on three targets |
| `bundle.json` | hand | nothing — there is nothing in it to check |

The four things the catalogue has to do — show the code and the documentation,
build a form, show the cases and their results, wrap the thing as a web
service — each come from one of those, and none of them is written twice. That
is explainable in a paragraph, which is the test this had to pass.

## Does it document?

`BUNDLE.md` is 330 lines and normative; `examples/formulas/README.md` is the
index and the quick start; `examples/formula-bundle.ts` is the reference
implementation of every rule, and the integration suite holds all thirteen
bundles to it (112 tests, nine of which break a rule on purpose). A format whose
spec and whose lint can disagree is a format nobody can rely on; these cannot,
because the lint is what the tests run.

## Can we live with it?

The honest list of what still grates:

1. **Five files for four lines of logic.** `leap-year` is 5 lines of types, 13
   of formula, 13 of form, 39 of cases, 8 of manifest — 78 lines around a
   one-line rule. Three of those files are the reason a catalogue exists
   (documentation, form, cases), one is generated, and what an author actually
   writes is types + formula + cases. But it is the first thing anyone will
   balk at, and the balk is fair.
2. **`bundle.json` is the thinnest file in the bundle**: `bundle: 1` is a
   constant, `license: 'MIT'` is identical in all thirteen, `version` has never
   been bumped, and `tags` is the only per-bundle content. It is also the only
   file that is not Elo. The reason it survives is the catalogue index — a
   thousand names, versions and tags should be a thousand plain parses, not a
   thousand compiles — and that reason is now written down. If we lose one
   file, it is this one, and the day the index wants more than four keys is the
   day to decide.
3. **`fields.elo` repeats half of a type.** Generated and checked, so it cannot
   drift — but it is still the exception to the rule, and it is the exception
   on purpose: a form builder in any language should not need an AST walker.
4. **650 lines of reference implementation in `examples/`.** It is a host's
   code, not the compiler's, and a host copies it. Making it a package entry
   point would put the bundle format inside the versioning promise, which it has
   not earned.
5. **No SQL**, for any of it: a formula is a lambda and the types are type
   definitions.

What I would not change: cases as data with a generated runner (the runner was
thirteen copies of eight lines before), `Output` applied rather than declared
(it caught a `Float` declared `Int` on two targets out of three), and the doc
comment as the documentation.

## Still open, and not for this branch

- `ideation/0235` — a literal union type (`'standard' | 'silver' | 'gold'`)
  would make `options` derived rather than written-and-checked, and would
  remove the one exception to the rule. Three choice fields out of thirteen
  bundles is not yet enough evidence to widen a type expression.
- `ideation/0234` — the REST contract. With bundles the resource is the
  directory: `/foo/bar/age` is the formula and `/foo/bar/age/formula.elo` one
  representation of it.
- Nothing shares a module between bundles yet. The first shared `Money` is when
  a bundle stops being self-contained, and that is worth deciding before it
  happens rather than after.

## The branch

Rebased on `main` and squashed to **one commit**: the branch proposes one
thing, and the four passes it took to get there contradict each other by
design — a reviewer should read the proposal, not the search. The passes are
still on record where the record belongs, in the tasks: 0226 (the thirteen
formulas), 0233 (the bundle), 0236 (the types file), 0237 (the form file), and
this review.

Splitting it in two was considered and dropped: the catalogue cannot be a
commit of its own, because the files are named, generated and checked by the
format — the first half would not stand up without the second.
