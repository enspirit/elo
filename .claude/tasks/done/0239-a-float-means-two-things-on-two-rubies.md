# A Float means two things on two Rubies

> "Test for reference/type-selectors.expected.ruby seems to fail on github.
> Find why and fix it on master."

## Why

One line, added by 0227:

```elo
assert(Float('1.') == 1.0)
```

| Ruby | `Float("1.")` |
| --- | --- |
| 2.7, 3.2, 3.3 | **raises** `ArgumentError` |
| 3.4, 4.0 | `1.0` |

CI pins `ruby-version: '3.2'`; this machine runs 3.4.1. So the assertion was
written and seen green against a Ruby that accepts a trailing decimal point,
and it went red on a Ruby that does not:

```
✗ reference/type-selectors.expected.ruby
-:25: .: expected Float, got "1." (RuntimeError)
<internal:kernel>:173:in `Float': invalid value for Float(): "1." (ArgumentError)
```

Exactly one fixture of the corpus fails, on 3.2 and on every Ruby before 3.4.

## The actual defect

Not the assertion. **Elo's answer depended on which Ruby the host runs**, which
is the one thing the language promises it never does. `Float('1.')` is `1.0` on
JavaScript, on Python and on PostgreSQL; on Ruby it was whatever
`Kernel#Float` happened to think that year.

And in two places, which is 0227's lesson repeating: the `Float()` **selector**
in `src/bindings/ruby.ts`, and the **schema** parser `p_float` in
`src/runtime.ts`. `{ a: '1.' } |> { a: Float }` had the same split.

## Fix

A `k_float` helper in the Ruby prelude that answers the question Elo is asking —
*is this string a number, and which one* — instead of delegating it to the host:

```ruby
def k_float(v)
  return v.to_f if v.is_a?(Numeric)
  s = v.to_s.strip
  raise ArgumentError, "not a Float: #{s.inspect}" unless s.match?(/\A[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\z/)
  s.to_f
end
```

The grammar is the one JavaScript's `pFloat` got in 0227, so the four targets
now accept the same set. Both the selector registrations and `p_float` call it,
so the selector and the schema agree by construction rather than by luck.
`to_f` is safe after the match, since the match is what refuses garbage.

**`Integer` needs nothing.** `Integer(s, 10)` was checked across 2.7, 3.2, 3.3,
3.4 and 4.0 and answers the same on all five for everything the corpus asserts
(`'08'` → 8, `'010'` → 10, `'-08'` → -8). It keeps using the host's parser, and
the asymmetry is deliberate: Float needed its own grammar because its answer
differed, Integer did not.

## Tests

Red first, on the compiler without the fix:

- `reference/type-selectors.elo` — **red on Ruby 3.2 (and 2.7, 3.3), green on
  3.4**: the CI failure, reproduced by running the suite under
  `RBENV_VERSION=3.2.2`.
- `reference/type-definitions.elo` — four new assertions for the *schema* path,
  `'1.'`, `'.5'`, `'1e3'` and `{ a: '1.' } |> { a: Float }`. The first is **red
  on 3.2, green on 3.4** before the fix: the same split, in the place nothing
  had asserted.

Green after, with the whole Ruby corpus (124 fixtures) run under **five Ruby
versions**: 2.7.8, 3.2.2, 3.3.4, 3.4.1 and 4.0.7.

## Blast radius

Four Ruby expected files: every emission of `Float(String)` gains the helper.
Nothing else moves — JavaScript, Python and PostgreSQL are untouched.

## The guard

`.github/workflows/ci.yml` now runs the job over
`ruby-version: ['3.2', '3.4']`, with `fail-fast: false` so a failure reports
*which* version disagreed instead of cancelling the other leg. The two are the
two sides of the `Kernel#Float` change, which is why they are the two. It costs
a second run of node, python and postgres for a Ruby-only question, and that is
the price of the promise: a Ruby version is a runtime, and the same program has
to mean the same thing on every runtime.

Both legs were run locally before adding them — the 124 Ruby fixtures, plain
and under `ELO_OPTIMIZE=1`, plus the failure-structure tests, on 3.2.2 and
3.4.1 (and the fixtures alone also on 2.7.8, 3.3.4 and 4.0.7).

The same argument now hangs over Python and PostgreSQL, which are pinned to one
version each. Nothing has gone wrong there yet; when it does, this is the shape
of the answer.

Smaller thing, same family, noticed while running this: `npm run build` does not
clean `dist/`, so a test file compiled on one branch keeps running after a
checkout of another. `rm -rf dist` between branches, or a `clean` script.
