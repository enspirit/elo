# Ruby sandbox

Runs compiled Elo in a forked child bounded by CPU, address-space, and
wall-clock limits; the result returns over a pipe.

```ruby
require_relative 'run_elo'

run_elo('->(_) { _ * 2 }', 21)   # => 42
```

- `RLIMIT_AS` (the memory ceiling) is a **Linux** lever; macOS rejects it, so
  there it is skipped and the wall-clock reaper is the backstop. Run production
  on Linux to get the memory cap.
- Run the child as a **low-privilege user**. Keep `mem_mb` generous — it bounds
  runaway growth, not the interpreter baseline.
- If an expression uses dates/durations, `require` the prelude's dependencies
  (`date`, `active_support`) inside the child.

Smoke test: `ruby run_elo.rb`.
