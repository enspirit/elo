## Problem to solve

`StdLib.lookup` generalises a **statically known** type to `any`, then accepts
any registration of matching arity. So this type checks:

```elo
upper(42)     # dispatches to upper(Any), emits a call that cannot work
```

The generalisation exists so that dynamic values — lambda parameters, member
accesses, anything the inferencer cannot pin down — still reach an
implementation. That is load-bearing. But it does not distinguish "I do not
know this type" from "I know this type and it is Int".

## Context

This is the common root under several reported symptoms:

- `upper(42)` compiling at all (Bricks, point 10; the unparseable JavaScript
  it produced is fixed, the dispatch is not).
- The Python parenthesisation defect fixed in 1.1.0: `isNativeBinaryOp`
  disagreed with what the same fallback actually emitted.
- `min('a', 'b')` answering NaN after 1.1.0 added the two-argument form —
  caught and fixed, but only because the report made us look.

Bricks' own conclusion names the pattern exactly: *ce qui échoue bruyamment se
répare, ce qui réussit à côté de la cible se propage*. Every one of these is
Elo failing to refuse.

## Direction, not yet a proposal

Distinguish **unknown** from **known-and-concrete** at dispatch. A concrete
`Int` would not match a registration for `Any` unless that registration opts
in; an `any` coming from genuine inference failure still would.

The blast radius is the whole stdlib — every `[Types.any]` registration would
need to say which it means — so this wants a spike before a plan: count the
registrations that would have to change, and check how many expressions in
`test/fixtures` stop compiling.

Worth doing: it is where a fourth parenthesisation-class fix would pay the
most, because it stops the class rather than its instances.
