# A string function forgets the parentheses around its receiver

> Third defect found while building the formula catalogue of 226, and the
> second of the same family as 0229: a target emits an expression that is not
> self-delimiting, and the syntax around it re-associates. Found by the
> password-strength formula asking `contains(lowers + uppers + digits, c)`.

## Symptom

Two halves, different targets.

**One.** A receiver that is an expression, with everything typed:

```elo
startsWith('ab' + 'cd', 'abc')
```

| Target | Emitted | Answer |
| --- | --- | --- |
| JavaScript, Ruby, PostgreSQL | receiver parenthesised | `true` |
| **Python** | `"ab" + "cd".startswith("abc")` | **raises** `can only concatenate str` |

Python wraps the receiver of the one-argument family (`upper`, `trim`, …)
through `pyMethod`, and of nothing else. So `startsWith`, `endsWith`,
`substring`, `slice`, `reverse` and `isBlank` were all wrong on a concatenated
receiver — `substring('ab' + 'cd', 1, 2)` is `"ab" + "cd"[1:3]`, which is
`'abd'`, silently.

**Two.** A receiver that is an expression, with a needle whose type is not
statically known (a lambda parameter, a member read, anything `any`):

```elo
let a = 'ab' in map(['z'], fn( x ~> contains(a + 'cd', x) ))
```

| Target | Emitted | Answer |
| --- | --- | --- |
| Python, PostgreSQL | correct | `[false]` |
| **JavaScript** | `a + "cd".includes(x)` | **`["abfalse"]`**, truthy |
| **Ruby** | `a + "cd".include?(x)` | **raises** `TypeError` |

The string family is registered as `[string|any, string]`, so an `any` needle
does not match it and the lookup falls through to `contains([array, any])` —
the *list* registration, which emits the same `.includes` / `.include?` (both
read a string and a list alike, which is why nothing else broke) but did not
wrap its receiver.

## Fix

- Python: a `wrapReceiver` helper, as JavaScript and Ruby already had, applied
  to every string emission with a receiver — the method calls, the subscripts
  (`substring`, `slice`), the slice (`reverse`) and `isBlank`.
- JavaScript and Ruby: `contains([array, any])`, which is the fallback for an
  unknown receiver or needle as well as the list case, now wraps its receiver
  too. The helper moved up to where it is first needed.

## Tests

- `test/fixtures/stdlib/string/concatenated-receiver.elo`, new — the whole
  two- and three-argument string family applied to `'ab' + 'cd'`, next to the
  `numeric-receiver.elo` fixture that pins the one-argument family. Red first:
  **Python 6 lines** (`startsWith`, `endsWith`, `substring`, `slice`,
  `reverse`, `isBlank`), JavaScript, Ruby and PostgreSQL green.
- `test/fixtures/reference/precedence-dynamic.elo` — the same calls with an
  `any` second argument, including the list `contains`. Red first: **Ruby 4
  lines, Python 4, JavaScript 2**.

## Blast radius

None recorded: no fixture in the corpus called a string function on an
expression receiver before this one, which is exactly why the defect survived.
The regenerated files gain the new lines and change nothing else.
