# Elo sandboxes

Reference wrappers for running compiled Elo over **untrusted** expressions.

Elo is a *capability* sandbox by construction — compiled code can't do I/O,
can't `eval`, can't reach host globals (see <https://elo-lang.org/security>). It
is **not** a *resource* sandbox: a legal expression can still spend a lot of
time or memory over the data you give it. These wrappers add the missing
resource layer.

Every wrapper enforces the same four levers:

1. **Isolate** — run the emitted code in its own thread/process/context.
2. **Cap memory** — a hard ceiling, so a big allocation fails instead of taking
   the host down.
3. **Cap time** — a wall-clock/CPU timeout with a hard kill.
4. **Pass data only** — the input must be plain, JSON-shaped data, never a live
   host object whose own methods could run.

| Target | Directory | Memory lever | Time lever |
|--------|-----------|--------------|------------|
| Node.js | [`node/`](./node) | `worker_threads` `resourceLimits` | `worker.terminate()` |
| Browser | [`browser/`](./browser) | (keep inputs small) | `worker.terminate()` |
| Ruby | [`ruby/`](./ruby) | `setrlimit(:AS)` | `setrlimit(:CPU)` + reaper |
| Python | [`python/`](./python) | `setrlimit(RLIMIT_AS)` | `setrlimit(RLIMIT_CPU)` + `subprocess` timeout |
| PostgreSQL | [`postgres/`](./postgres) | `work_mem` | `statement_timeout` |

> These are **starting points, not hardened products.** Tune the limits to your
> workload, run under a low-privilege user/role, and review before shipping.

See the narrative guide at <https://elo-lang.org/running-safely>.
