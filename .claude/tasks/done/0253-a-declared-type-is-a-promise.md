# A declared type is a promise

> "Keep working on remaining items then close the task."

H5 from `0244`, and §1.4 — the one class where nothing machine-checked the
*property* rather than the shape.

`--input-type '{xs: [Int], i: Int}'` tells the checker what the input is.
Nothing validates it at runtime: `_.i` compiles to a bare read that hands back
whatever arrived. So every emitter chosen *because the checker knows the type*
performs an unguarded operation on an unvalidated value, and `--optimize` turns
the whole program into that situation. It is exactly the 1.2.4 escape:
`at(_.xs, _.i)` declared honestly, sent `{xs: [], i: 'constructor'}`, returning
the `Array` constructor.

## The property, stated carefully

**`--optimize` must not let a lie about the input become a capability.**

Not "must not raise". A program told its input is an Int and handed a function
may legitimately throw a host TypeError; the security page's *"bad input yields
a typed Elo error"* is a promise about **compiling source**, not about
evaluating data that breaks its declared contract. What must never happen is the
runtime promise — *"cannot reach host-runtime internals, such as the prototype
chain or the Function constructor."* So the assertion is on the **value**.

`test/integration/lying-input.integration.test.ts`: 19 programs whose emission
changes when the checker knows the input type, × 13 hostile inputs, compiled
under `--optimize --input-type` and run, asserting the result carries no
capability.

## Two mistakes the test made first, both worth recording

**It was vacuous.** `compileToJavaScript(ast, { execute: true })` wraps the
program in a self-invoking IIFE with `_` bound to null. So
`factory(…)(input)` was calling the *result* rather than the program, every
case threw "not a function", and every case was skipped by the catch. It passed
20/20 and tested nothing — and I only noticed because reverting the fix it is
modelled on did not turn it red. The bare form, `(function(_) { … })`, is the
callable one.

That is the second time on this branch that a green harness turned out to be
green for the wrong reason. The lesson is the same both times: a new test is
not finished until the revert has been tried.

**Then it was too strict.** With the input actually reaching the program, three
cases failed — and none was a bug. The inputs that embed a host function
(`{a: () => 42}`) got that function handed straight back by `_.a`, and
`patch(_, .a, 1)` copied it faithfully into its result. That is the documented
host contract ("pass data, not host objects"): Elo did not *reach* a
capability, it returned what the host put in.

So `leak()` now takes the set of identities reachable from the input, and a
leak is a function or foreign-prototype object that the input never contained.
`[]['constructor']` is a leak because `Array` is not in the input;
`patch` echoing the host's own function is not.

Getting that distinction right is most of the value of the test. A version that
flagged both would have been abandoned as noisy within a week.

## Seen red

Reverting `src/bindings/javascript.ts` to before the typed-`at()` fix:

```
declared {xs: [Int], i: Int}, was handed "meta-property as index",
and returned a function
```

Two assertions red. The emitted-grammar gate catches the *shape* that caused
1.2.4 — a computed read with a runtime index. This catches the *property*, which
the next §1.4 bug may violate with a shape nobody has thought of.

## State

Unit 2308, integration 4243. No `src/` change.
