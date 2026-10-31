# replace() needle is a regex on SQL but a literal everywhere else

- **Found by:** internal security review.
- **Severity:** Medium — portability/correctness bug, with a latent ReDoS
  surface on PostgreSQL.
- **Status:** deferred — the fix is a semantics decision, not a mechanical patch.

## The issue

`replace(s, needle, replacement)` compiles the needle as a **literal** on JS,
Ruby and Python but as a **regular expression** on SQL:

```
replace('a.b.c', '.', 'X')
  JS:     "a.b.c".replace(".", "X")        -> "aXb.c"   (literal '.')
  Ruby:   "a.b.c".sub(".", "X")            -> "aXb.c"   (literal '.')
  Python: "a.b.c".replace(".", "X", 1)     -> "aXb.c"   (literal '.')
  SQL:    REGEXP_REPLACE('a.b.c','.','X')  -> "X.b.c"   ('.' = any char)
```

So the same Elo expression yields different results on SQL — a direct violation
of the "portable" design principle. It is also a latent **ReDoS** surface: if
the needle is attacker-controlled, on PostgreSQL it becomes a regex and can be
made to backtrack catastrophically.

## Why not fixed yet

Fixing it changes SQL output (and possibly the semantics of `replace` across the
board), which is a language decision:

1. **Make SQL literal** to match the other three backends — use
   `REPLACE(...)` (literal substring replace) instead of `REGEXP_REPLACE`, or
   escape the needle's regex metacharacters before emitting. Aligns SQL with the
   apparent intended semantics (literal replace). Recommended.
2. **Make all backends regex** — would be a breaking change to JS/Ruby/Python
   `replace` and re-introduce the ReDoS surface everywhere. Not recommended.

Also audit whether `replace` is meant to replace the first match or all matches
(JS/Ruby `sub` replace first; Python passes count `1`; SQL `REGEXP_REPLACE`
without `g` replaces first) — settle first-vs-all consistently while here.

## Proposed implementation

Decide on literal semantics (option 1), switch the SQL binding to a literal
replace (or regex-escape the needle), reconcile first-vs-all across backends,
add cross-backend acceptance tests asserting identical results, and document the
agreed semantics on the stdlib reference page.

## Decision

No Regexp for now, use REPLACE.
