## Problem to solve

I don't like NULL, since it's not a value, but in the real world (json, ruby,
js, SQL) it's everywhere so we need some support for it.

I would'nt add a NULL literal yet, but would provide basic support for null
handling on data coming from the outside world :

* A `isValue` stdlib function that returns false if null/undefined/nil/NULL
* A `x ?? 12` construct that would replace null/undefined/nil/NULL by 12
* Possibly a `Null` type, returned by `typeOf`

## Idea

Help me design this so that null is handled in practice, without becoming
a real language construct.
