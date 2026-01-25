## Problem to solve

Data taken from the outside world (typically json) only support a couple
of scalar types, and notably not Date and DateTime.

More generally, it's often required to be able to coerce/parse a string to
a scalar value. `parseInt`, `Date.parse` and all that jazz.

I don't like support of most existing programming languages to that problem,
introducing lots of parse functions without much consistency. I strongly
prefer Finitio's information contracts and would like support for them in Elo.

## Information contracts

The idea is pretty simple. Every high-level type of Elo should have an
overloaded Selector (aka constructor), that allows selecting a type value,
or coercing another value (typically a string) to a value of the type.

Let's take `Int` as an example.

The contract is clear: if `Int(x)` succeeds then the following invariant holds:
`assert(typeOf(Int(x)) == 'Int')`. Otherwise `Int(x)` MUST fail. A edge case
is that `x` is already an `Int`, in which case the selector is idempotent and
returns `x` itself.

When a Selector is overlodaded, we sometimes talk about possible representations.
Let's take a `Datetime` that can be selected by either an ISO8601 string or an
epoch integer. We could have:

```
Datetime<iso8601>(str: String) -> Datetime or fail
Datetime<epoch>(epoch: Int) -> Datetime
```

## Idea

In general then, in Elo, we could have support for information contracts, so
that this could work:

```elo
assert(Datetime<iso8601>('2025-10-19T19:00:00') == D2025-10-19T19:00:00)
assert(Datetime<epoch>(1760893200) == D2025-10-19T19:00:00)
```

More generally, the user could skip the information contract name and do this:

```elo
assert(Datetime('2025-10-19T19:00:00') == D2025-10-19T19:00:00)
```

## Claude's Observations

### What I Like

1. **The problem is real** - JSON's limited type support is a genuine pain point, and parsing/coercing strings to richer types is ubiquitous.

2. **The Finitio-inspired approach is elegant** - Using type names as selectors (`Int(x)`, `Datetime(x)`) is intuitive and reads naturally.

3. **The invariant is crisp**: `typeOf(Int(x)) == 'Int'` - this is a solid contract.

4. **Named representations** (`Datetime<iso8601>`, `Datetime<epoch>`) disambiguate nicely when multiple coercion paths exist.

### Concerns

1. **Error semantics** - "or fail" raises the question: how does Elo handle failures? Currently Elo seems to lack exception/error handling. This might need to be addressed first, or you'd need a `try`/`Option` pattern.

2. **Cross-target consistency** - Making `Datetime<epoch>(n)` behave identically across Ruby, JS, and PostgreSQL is non-trivial (timezones, precision, epoch semantics differ).

3. **Complexity vs. simplicity** - Per the design principles, simplicity comes first. This feature adds:
   - New syntax (`Type<contract>(...)`)
   - Overloaded dispatch on selectors
   - Error handling semantics

   Is this the right time, or should simpler foundations (like better error handling) come first?

4. **The generic form** - `Datetime('2025-10-19T19:00:00')` without a contract name implies automatic detection. This could be brittle or surprising.

### Suggestions

Before implementing, brainstorm:

- What's the minimal subset that delivers value? (Maybe just `Int(str)`, `Float(str)`, `Date(str)`, `Datetime(str)` with strict ISO formats?)
- How do failures propagate? (Return `null`? Throw? Require `Option`?)

The idea is sound, but the scoping matters for keeping Elo simple.

## Tasks

- Let's brainstorm about idiomatic information contracts for our type system
- Let's find a plan to add information contracts to Elo, see if it's risky or not
