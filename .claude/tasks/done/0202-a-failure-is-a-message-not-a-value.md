# A failure is a message, not a value a host can branch on

## Problem to solve

A host that embeds Elo usually has to do something different depending on *why*
a call failed: data that never arrived is not the same event as data that
arrived and was refused, and neither is the same as an invariant that did not
hold. Today the only way to tell them apart is to read the English prose.

```elo
Pos = Int(i | positive: i > 0)
Rec = { a: Pos }
_ |> Rec
```

| Input | Message |
| --- | --- |
| `{"a":"x"}` | `.a: expected Int, got "x"` |
| `{}` | `.a: expected Int, got undefined` |
| `{"a":0}` | `.a: constraint 'positive' failed` |
| `{"a":1,"b":2}` | `.b: unexpected attribute` |

and from the assertion forms:

```elo
let x = 0 in guard positive: x > 0 in x    # guard 'positive' failed
let x = 0 in check positive: x > 0 in x    # check 'positive' failed
```

Every one of these carries structure — a path, sometimes a constraint label,
and a kind — and every one of them has flattened it into a sentence. So a host
that needs the kind writes something like this:

```js
if (/got undefined/.test(err.message))      return 'MISSING';
if (/constraint '|: expected /.test(err.message)) return 'INVALID';
if (/check '/.test(err.message))            return 'INCONSISTENT';
```

## Why it matters

It makes the wording of a message part of the public interface, without saying
so. Rewording `got undefined` to `no value` is a one-word improvement to a
diagnostic and a silent breaking change for every host that branches on it —
the host keeps compiling, keeps running, and starts returning the wrong
category. There is no version of this that a test in Elo's own suite would
catch.

It also pushes hosts to parse a path out of a string when they want the field
name, which is the one piece of the message most likely to be acted on.

## What it should be

The error the runtime raises carries what the message already says:

```js
{
  kind: 'schema' | 'constraint' | 'guard' | 'check' | 'missing',
  path: '.a',                  // where, for the schema kinds
  label: 'positive',           // the constraint, guard or check name
  message: '.a: constraint \'positive\' failed'
}
```

`message` stays exactly as it is — it is for a human, and nothing about this
asks it to be stable. `kind` and `label` are for the host, and are.

Scope notes:

- This is a JavaScript API change. No new construct, no change to the IR, no
  change to what any target emits.
- Ruby and Python raise their own errors from their own preludes; the same
  fields are worth having there, but each target can be a step of its own, and
  the JavaScript one is the one hosts embed.
- Related to 0158, and distinct from it: 0158 asks that a failure name *where*
  in the source it came from, which needs positions carried into the IR. This
  asks only that it say *what kind of thing* it was, which the raising site
  already knows. The two compose; this one is small enough to do on its own.

## Tests

One assertion per kind in the table above, on the shape of the raised error
rather than on its message. Plus one that pins the intent directly: a test that
asserts a *reworded* message does not change `kind` — i.e. the fields and the
prose are decoupled by construction, not by accident.
