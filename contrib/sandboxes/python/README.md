# Python sandbox

Runs compiled Elo in a child process bounded by CPU, address-space, and
wall-clock limits. Input is fed as JSON on stdin (plain data by construction).

```python
from run_elo import run_elo

run_elo("(lambda _: _ * 2)", 21)          # => 42
run_elo("(lambda _: _.upper())", "hi")    # => "HI"
```

- `RLIMIT_AS` (the memory ceiling) is a **Linux** lever; macOS rejects it, so
  there it is skipped and the `subprocess` wall-clock timeout is the backstop.
  Run production on Linux to get the memory cap.
- Keep `mem_mb` generous — `RLIMIT_AS` bounds the child's whole virtual address
  space, which must include the Python interpreter itself.
- Pass Elo's `--prelude` output via the `prelude=` argument if the expression
  uses dates/durations.

Smoke test: `python3 run_elo.py`.
