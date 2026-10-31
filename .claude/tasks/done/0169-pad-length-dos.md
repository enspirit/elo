# pad / padStart / padEnd with huge length — unbounded allocation DoS

- **Found by:** internal security review (same allocation class as
  [[0168-string-repeat-dos]] and [[0165-array-repeat-dos]]).
- **Severity:** High (availability) on all backends.
- **Status:** deferred — needs the same bound decision as string repeat.

## The issue

`padStart`/`padEnd` take a target length with no upper bound:

```
padStart('x', 1000000000, '-')   # Python: "x".rjust(1000000000, "-") -> ~1 GB
                                 # Ruby/JS/SQL: equivalent huge allocation
```

The length can be data-driven (`padStart(_, Int(_), '-')`), so an attacker who
controls either the Elo source or the input count can OOM the host. The disclosed
array-repeat report referenced this as the prior "padStart T6 finding", so the
category is known.

## Why not fixed yet

Like string repeat, a bound changes behaviour for large finite lengths — a
semantics decision reserved for the maintainer. The natural choice is to reuse
whatever limit is picked for [[0168-string-repeat-dos]] (a padded string and a
repeated string are the same allocation shape), so these two tickets should be
decided and implemented together.

## Proposed implementation

Clamp/validate the pad length against the shared string-length bound in a runtime
helper on each backend, raising past the limit. Red/green acceptance + unit
tests. One sentence on the security page.

## Decision

Similar to 0168, same env var/compiler parameter.
