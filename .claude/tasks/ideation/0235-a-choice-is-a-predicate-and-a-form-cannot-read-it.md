# A choice is a predicate, and a form cannot read it

> The one thing the formula bundle of 0233 has to state twice. Everything else
> a catalogue needs is derived from the Elo source; a dropdown is not.

## The case

Three of the thirteen formulas have a field with a fixed set of values:

```elo
Tier  = String(t | known: t == 'standard' || t == 'silver' || t == 'gold')
Zone  = String(z | known: z == 'domestic' || z == 'eu' || z == 'world')
Terms = String(t | known: t == 'NET15' || t == 'NET30' || t == 'NET60' || t == 'EOM30')
```

That is a correct and enforced declaration — the formula refuses anything else,
with `.tier: constraint 'known' failed`. What it is not is *readable*: a form
builder looking at the type sees `String` with a predicate, and a predicate is
an arbitrary expression. So `bundle.json` lists the options for the widget:

```json
"tier": { "label": "Customer tier", "options": ["standard", "silver", "gold"] }
```

and the bundle now says the same thing twice, in two languages, one of which is
not executed. That is exactly what the format's one rule forbids everywhere
else, and the only place it is broken.

Nothing catches a drift, either. Add a fourth tier to the predicate and the
dropdown still offers three; remove one from the predicate and the dropdown
offers a value the formula will refuse. The only check available is to try
every option against the formula, which needs a whole input to try it in.

## The proposal: a literal in a type position

```elo
Tier = 'standard' | 'silver' | 'gold'
```

A union of string literals, which is a type whose members a form can read
directly. `union_type` already exists in the AST and `Int|Null` already
compiles; what is missing is a literal as a member of one.

What it buys:

- `options` leaves the manifest, and the bundle is back to one copy of
  everything.
- The checker gets something real: `tier == 'glod'` is comparing against a
  value the type cannot hold, which today nothing can know.
- The predicate it replaces is the long way round: `known: t == 'a' || t == 'b'
  || t == 'c'` is a hand-written `in` over three literals.

What it costs, which is the part to weigh:

- **A second kind of thing in a type position.** Today a type expression names
  types; this lets it name values. That is a real widening of the grammar, and
  the design principles put simplicity first.
- **Where does it stop?** `1 | 2 | 3` for an Int, and dates? A union of literals
  of *different* types (`'a' | 1`)? Each answer is a further decision, and
  "string literals only" would be an arbitrary line, while "any literal" is a
  bigger language.
- **The failure wording.** `.tier: expected one of 'standard', 'silver',
  'gold', got 'bronze'` is a better message than `constraint 'known' failed` —
  but it is a *new* message, and the `kind` it carries (`schema`? a new
  `enum`?) is public interface.
- **Four targets.** The runtime check is a membership test in a literal list,
  which every target can do; the SQL target refuses type definitions outright,
  so it is three.

## The cheaper alternatives

1. **Leave it.** `options` in the manifest, documented as presentation under
   protest, with a lint that cannot check it. This is what 0233 shipped, and it
   is not unreasonable: a catalogue author owns both files, and a wrong option
   shows up the first time someone picks it.
2. **A `contains` idiom, read by the form builder.** Write the constraint as
   `String(t | known: contains(['standard', 'silver', 'gold'], t))` and have the
   catalogue recognise *that one shape* in the AST. No language change, and the
   options become derivable — but a catalogue pattern-matching on the shape of
   a predicate is a convention with no enforcement, and the day someone writes
   the disjunction instead, the dropdown silently empties. It also needs
   `contains(list, x)` to be the idiomatic spelling, which it currently is not.
3. **Name the constraint `oneOf` and extract its literals.** The same as 2, by
   a different marker. Same objection.

Option 2 is the honest middle: it needs nothing from the language, and it makes
the *type* the single source of the options, in one recognised spelling. It
just cannot be enforced.

## What I would decide

Not now. Three formulas out of thirteen is not enough evidence to widen a type
expression, and `options` in a manifest is a small, visible wart that a
catalogue can live with. The thing to watch: if a catalogue of a hundred
formulas has forty choice fields, this stops being a wart and the literal union
becomes the simplest thing that can work — including for the checker, which is
the argument that does not depend on forms at all.
