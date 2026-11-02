# A compile-time diagnostic says what, not where

## Symptom

A parse error says where it is. Everything the checker and the transform refuse
does not.

```elo
let x = ( in x            # Unexpected token IN at line 1, column 11
rond(1, 2)                # Unknown function rond(Int, Int)
concat('a', 'b', 'c')     # No signature of concat accepts concat(String, String, String).
                          #   Known: concat(String, String), concat(Any, String)
let a = 1, a = 2 in a     # Duplicate binding 'a'
T = Int
T = String
1                         # Duplicate type definition 'T'
```

The first has a line and a column. The other four have neither, in a file of
any length.

The last two are the sharpest version of it, because they are the newest: a
diagnostic whose entire job is to point at one of two colliding names cannot
say which line either of them is on.

## Why it matters more now

Before 0199 a program was one file, so "somewhere in this expression" was a
small place. An imported program is many files, and 0199 gave `SourceLocation`
a `file` precisely so that a diagnostic could name the module it came from.

That works for the parser:

```
Cannot import 'helpers.elo': Expected RPAREN but got COMMA
  at line 4, column 45 of helpers.elo
```

So the carrier exists and is already threaded. What is missing is that the
checker and the transform do not put anything in it — a name collision between
two modules reports neither module.

## What it should be

Every refusal names a position, and when the node came from a module, the
module.

The nodes are already there. Under `locations: true` the AST carries positions,
and a checker or transform refusal happens with the offending node in hand — so
unlike 0158's runtime half, nothing has to be carried through the IR or mapped
back from generated code. It is a matter of taking the location off the node at
each throw site and putting it in the error.

Mechanical rather than deep, and broad: there are many throw sites. The payoff
is that it is done once and is then visible everywhere.

Worth deciding at the same time: whether a diagnostic that *inherently* names
two places — the two collisions above — reports both, or the second with the
first mentioned. The second reads better and is what most compilers do.

## Relation to other tasks

- **0158** asks that a *runtime* failure name the expression that caused it.
  That needs positions in the IR and a mapping back from emitted code, and
  0158 itself scopes it as "a project". This task is the compile-time half,
  where the node is in scope at the moment of the refusal, and is small by
  comparison. Doing this one does not do that one, and does not block it.
- **0199** supplied `SourceLocation.file`, which this task is the natural
  consumer of.

## Tests

- Each diagnostic in the symptom list reports a line and a column.
- The same errors, written inside an imported module, additionally report the
  module.
- A test per diagnostic code, so that a new refusal cannot be added without a
  position — the regression this task is really about is the next diagnostic,
  not the current ones.
