# Elo security model — refinement draft

> Draft for Bernard. One document now; the sections are written to be split
> later into their destinations:
> - **§1–§3** → rework of the website **security page** (`web/src/pages/security.astro`)
> - **§4** → the **bug bounty** rules on that page
> - **§5** → a new **"Running Elo safely"** cookbook page + per-target reference
>   sandboxes under `contrib/`
> - **§6** → the **announcement** (blog post + GHSA/CVE housekeeping)

The recent round of reports made one thing clear: we were treating "security"
as a single promise, and it is really two promises with very different shapes.
Keeping them separate is what lets us make strong commitments where we can and
honest disclaimers where we can't.

---

## 0. The trust model — start here

Elo is not one tool with one security posture. The posture is set entirely by
*whose* code and *whose* data you run. Four things in the pipeline each carry an
**independent** trust level:

```
author → Elo code ┐
                  ├─(compile infra)→ target code →(runtime infra)→ result
caller → input _  ┘                               over data _
```

1. **Elo code** — the expression, as source or as an AST handed to `compileTo*`.
2. **Input `_`** — the data the compiled code runs over.
3. **Compile infrastructure** — the process/host that runs the Elo compiler.
4. **Runtime infrastructure** — the process/host that runs the emitted code.

**Elo's design defaults:**

- **Elo code — assume untrusted.** The product exists to run code written by
  people you don't fully trust. If *your* code is trusted, most of this relaxes
  — but we design, document, and triage for untrusted.
- **Input `_` — trust is your call, but the *shape* is contractual:** it must be
  plain data, not live host objects (§2.3b). Its confidentiality is your concern.
- **Compile & runtime infra — assumed trusted (you own them).** Elo's job is to
  keep them safe *from untrusted code*; your job is to add the resource sandbox.
  If the infrastructure itself is compromised or malicious, Elo promises nothing
  — that is an explicit non-goal.

**Two boundaries carry every guarantee** — the compile/runtime split in §1 is
just these two "untrusted → trusted" crossings:

- **B1 — untrusted code/AST → compile host.** Governed by §2.1.
- **B2 — untrusted code (∴ from untrusted source) + untrusted `_` → runtime
  host.** Governed by §2.2 (capability, Elo's job) and §2.3 (resources + data
  contract, your job).

**It is not the same tool in each combination.** This is the single most
important thing for an integrator to locate themselves on:

| Profile | Elo code | Input `_` | What Elo *is* here | What you rely on |
|---|---|---|---|---|
| **A** | trusted | trusted | a portable expression evaluator | correctness; a sandbox is hygiene, not load-bearing |
| **B** | **untrusted** | trusted | user formulas over your data — **the canonical case** | capability sandbox (Elo) **+** resource sandbox (you); mind what `_` exposes |
| **C** | trusted | **arbitrary** | your logic over foreign data | the data contract — `_` must be data, not host objects |
| **D** | **untrusted** | **arbitrary** | fully hostile input | both boundaries hot: everything in B and C at once |

"Trustworthy code on trustworthy data" (A) and "untrustworthy code on arbitrary
data" (D) are genuinely different products wearing the same binary. Our
guarantees, documentation, and bounty scope are written for the hard end (B/D)
so the easy end (A) is covered for free.

**Severity follows the boundary crossed**, not a bare CVSS score — "how far can
someone who controls *only* the untrusted assets reach into a trusted one":

| Attacker controls | Reaches | Severity |
|---|---|---|
| Elo code / AST | **code execution on the compile host** (eval, `toJSON`-style dispatch during compilation) | Critical · always fix |
| Elo code / AST | **code execution on the runtime host** (capability escape, eval, host internals) | Critical · always fix |
| Elo code / AST | **injection into emitted output** (fidelity break) | Critical / High · always fix |
| Elo code / AST | **DoS of the compile host** (hang / crash) | High · always fix |
| Elo code / AST | disproportionate-allocation *primitive* from a short expression | Medium–High · fix |
| Elo code / AST | expensive-but-legal cost at runtime | Out of scope → resource sandbox (§5) |
| Input `_` | its methods run because it was a live host object | Out of scope → data contract (§2.3b) |
| Compile / runtime infra | anything | Out of model (infra assumed trusted) |

---

## 1. Two layers: compile time and runtime

Elo is a compiler. It takes untrusted text (an Elo expression) and produces
code in a target language, which someone then runs over data. Security splits
cleanly along that seam.

**Compile time** — the behaviour of the Elo compiler *as a program*, from
source (or AST) to emitted code. The inputs are an expression string, or an AST
handed to `compileTo*`.

**Runtime** — the behaviour of the *emitted code* when the host executes it
over an input `_`.

These have different threat models, different owners, and should have different
rules. A single bug-bounty severity scale across both is what muddied our
earlier thinking.

---

## 2. What Elo guarantees

### 2.1 Compile time — a hard line we always hold

The compiler must, on **any** input including hostile and malformed ones (this
is boundary **B1**):

1. **Terminate.** Parsing and transforming always finish. No input makes the
   compiler loop or overflow the stack. (Our depth guards on every recursive
   parser/transform descent, and the type-expression depth fix, are exactly
   this.)
2. **Not be attackable — no code execution in the compiler itself.** Compiling
   untrusted source or AST must never run attacker code *in the compiler
   process*. That means: no `eval`/`new Function` on anything input-derived; no
   input-driven module loading; and — the subtle one — **no invoking an
   attacker-influenced method during compilation.** A `JSON.stringify(node)`
   that fires a `toJSON`, a string coercion that fires `toString`/`valueOf`, or
   a sort with an attacker-supplied comparator are all compile-host code
   execution. The compiler's own internal objects must likewise resist
   pollution from attacker-controlled keys (distinct from the emitted-code
   prototype-chain concern in §2.2). The prior "compile-time `JSON.stringify`
   calling `toJSON`" finding is precisely this class.
3. **Never crash uncontrollably.** Bad input yields a typed Elo error, never an
   uncaught `RangeError`/native exception that takes down the host process.
4. **Emit only what the author wrote (output fidelity).** The compiler never
   emits code that does something the Elo author did not express. In particular,
   no value that flows through the compiler — identifiers, keys, literals, type
   names — may break out of its syntactic slot in the generated code. This holds
   for the **AST API** as much as for source text: a macro/plugin system that
   builds or edits an AST and calls `compileTo*` is a supported, in-scope
   consumer.

In trust-model terms: properties 1–3 protect the **compile infrastructure**
from untrusted code/AST; property 4 protects the **fidelity of the output** that
will later cross B2.

**Policy: any violation of §2.1 is a bug and will always be fixed, at the
highest priority, regardless of how the input was produced.** There is no
"you shouldn't build that AST" defence here — if untrusted input can execute
code in the compiler, or a string field reaches a code position unescaped, that
is on us. (Property 4 is the class GHSA #3 and its follow-up covered:
identifier validation at every emit site.)

### 2.2 Runtime — capability sandbox *by construction*

The code Elo emits is a pure function of its input `_`. By construction it
**cannot**:

- call `eval` or build code at runtime — what you see is what runs;
- read files, open sockets, read environment variables, or touch host globals
  (`window`, `process`, `ENV`, …);
- reach host-runtime internals — e.g. the JavaScript prototype chain and the
  `Function` constructor (the `fetch()`/`patch()` meta-property denylist closes
  the dynamic-key paths to this).

**Policy: emitted code that reaches any host capability above, from a valid Elo
program or via the AST API, is a bug and will always be fixed.** This is the
"it's sandboxed" promise, and we keep it.

### 2.3 Runtime — what Elo does *not* and *cannot* guarantee

Two things live here. Both must be stated loudly, because silence here is how
people get hurt.

**(a) Resources — time and memory — are the operator's responsibility.**
A *legal* Elo program can still be expensive. It has no loops or recursion, but
it can:

- build a large value from the data you provide (`flat`, `sort`, large
  comprehensions over a big `_`);
- chain enough work to take meaningful CPU;
- allocate proportionally to its input.

We bound the obvious *primitives* that let a **short** expression allocate out
of proportion to its input — array repeat is rejected, string repeat and
padding are capped by `ELO_MAX_STRING_LENGTH`. But bounding every primitive does
not bound total cost, and we will never claim it does. Our commitment here is a
**best effort to minimize both the occurrence and the blast radius** of runaway
cost — not a guarantee. **Elo gives you a capability sandbox, not a resource
sandbox.** You must run compiled Elo under an OS/runtime sandbox that enforces a
memory ceiling and a wall-clock/CPU timeout. See §5.

**(b) The data contract — `_` must be data.** Elo operates on plain
JSON-shaped data: strings, numbers, booleans, null, lists, string-keyed maps.
If you hand the compiled function an arbitrary *host object* (an ORM row, a
`Decimal`, a class instance with operator overloads / `__add__` / `__int__`),
the target language will dispatch to that object's own methods — Elo cannot
prevent it, and that code runs outside the sandbox. Convert host objects to
plain data before evaluating. (This is the dunder-dispatch class; it is a
contract, not a compiler bug.)

---

## 3. The resulting promise, in one paragraph (website lede)

> Elo is a capability sandbox you can trust and a resource sandbox you must
> provide. The compiler always terminates, never crashes on hostile input, and
> never emits code you didn't write. The code it emits can't do I/O, can't call
> `eval`, and can't touch host globals or internals — it only ever works with
> the data you give it. It does **not** bound how much time or memory a legal
> expression may use, and it assumes the data you pass is data and not live host
> objects. Run compiled Elo the way you'd run any untrusted computation: under a
> memory limit and a timeout. We ship reference sandboxes for every target.

---

## 4. Bug bounty program — refined scope

Restructure the rules around the two trust boundaries (§0): **in scope** is
anything that lets untrusted Elo code/AST (or untrusted `_`) cross **B1** or
**B2** into a trusted host; **out of scope** is pure cost, data-contract
violations, and anything that assumes the infrastructure itself is trusted.
Concretely:

### Always in scope (fix guaranteed)

- **Compile-time termination / crash:** any input (source *or* AST) that makes
  `parse`/`compile`/`compileTo*` hang, overflow the stack, or throw an uncaught
  non-Elo error. *Severity: High.*
- **Compile-time injection:** any value threaded through the compiler that
  escapes its slot in emitted code (identifiers, keys, type names, literals),
  from source or the AST API. *Severity: Critical.*
- **Runtime capability escape:** emitted code, from a valid Elo program or the
  AST API, that reaches `eval`, I/O, host globals, or host-runtime internals
  (prototype chain, constructors). *Severity: High–Critical.*
- **Disproportionate-allocation primitive:** a **short** expression (size O(1)
  in `_`) that forces allocation grossly out of proportion to its input, via a
  stdlib primitive we failed to bound. *Severity: Medium–High.*

### Out of scope (by design — documented, not a compiler bug)

- A **legal expression that is simply expensive** over the data provided
  (large sort, deep chaining, big output). This is what the required resource
  sandbox (§5) exists for. We still treat it as a **best-effort target** —
  bounding disproportionate primitives and shrinking impact where we reasonably
  can — but not as a bounty-eligible vulnerability. Report the *missing bound on
  a short-expression primitive* (in scope) — not "I made a 2 GB input and it
  used 2 GB".
- **Resource exhaustion** (OOM, long run) that an OS/runtime memory+timeout
  sandbox would contain.
- Passing **non-data host objects** as `_` and observing their methods run
  (the data-contract violation).
- Behaviour of **your** host wrapper, prelude injection, or the runtime
  libraries Elo depends on (luxon, ActiveSupport), except where Elo emits a
  call that misuses them.

### Reporting & handling

- Keep the current 90-day coordinated-disclosure window and the 50 €/100 €/×2
  tiers, but tie severity to the categories above rather than a bare CVSS.
- Every valid §2.1/§2.2 report gets a CVE/GHSA and credit. "Demonstrate with a
  valid `.elo` program" stays the rule for runtime reports; for the AST-API
  injection class, a demonstration that builds the AST is accepted (that is the
  stated threat model).
- State explicitly: reports in the "out of scope" list are still welcome as
  *documentation* feedback (if our sandbox guidance is unclear) but are not
  bounty-eligible as vulnerabilities.

---

## 5. Run compiled Elo safely — reference sandboxes

The non-negotiable baseline for every target: **a memory ceiling and a timeout,
in an isolated execution context, over data-only input.** Below are minimal,
correct starting points — to live as a cookbook page and as copy-paste
reference wrappers under `contrib/sandboxes/`. They are starting points, not
hardened products; tune the limits to your workload.

### 5.1 Node.js (server)

Compile in the trusted process; run only the *output* in a worker that caps the
V8 heap, and kill it on a timeout.

```js
// elo-worker.js
const { parentPort, workerData } = require('worker_threads');
const { DateTime, Duration } = require('luxon');       // whatever the prelude needs
const fn = (0, eval)(workerData.code);                 // compiled Elo: (function(_){...})
parentPort.postMessage(fn(workerData.input));
```

```js
// run-elo.js  (host)
const { Worker } = require('worker_threads');
function runElo(code, input, { timeoutMs = 1000, maxHeapMb = 64 } = {}) {
  return new Promise((resolve, reject) => {
    const w = new Worker(require.resolve('./elo-worker.js'), {
      workerData: { code, input },
      resourceLimits: { maxOldGenerationSizeMb: maxHeapMb, maxYoungGenerationSizeMb: 16 },
    });
    const timer = setTimeout(() => { w.terminate(); reject(new Error('Elo: timeout')); }, timeoutMs);
    w.once('message', (v) => { clearTimeout(timer); resolve(v); w.terminate(); });
    w.once('error',   (e) => { clearTimeout(timer); reject(e); });
  });
}
```

Notes: the worker gives the **resource** layer (heap cap + hard kill); Elo gives
the **capability** layer. For defence-in-depth against a future capability bug,
run the worker in a process with dropped privileges, or use `isolated-vm`.

### 5.2 Browser

A Web Worker gives the same two levers — isolation and a hard `terminate()` on
timeout. Pass `_` by `postMessage` (structured-clone data only, which also
enforces the data contract for free).

```js
function runElo(code, input, timeoutMs = 500) {
  const src = `onmessage = (e) => { const fn = (0,eval)(e.data.code); postMessage(fn(e.data.input)); };`;
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { w.terminate(); reject(new Error('Elo: timeout')); }, timeoutMs);
    w.onmessage = (e) => { clearTimeout(t); resolve(e.data); w.terminate(); };
    w.onerror   = (e) => { clearTimeout(t); reject(e); };
  });
}
```

(Browsers can't cap a worker's memory directly; the timeout is the main lever.
Keep inputs small and prefer server-side evaluation for untrusted expressions.)

### 5.3 Ruby

Modern Ruby has no in-process sandbox (`$SAFE` is gone), so isolate with a
child process: set `RLIMIT_CPU` and `RLIMIT_AS`, enforce a wall-clock reaper.

```ruby
require 'timeout'

def run_elo(lambda_src, input, cpu_s: 1, mem_mb: 128, wall_s: 2)
  r, w = IO.pipe
  pid = fork do
    r.close
    Process.setrlimit(Process::RLIMIT_CPU, cpu_s)
    Process.setrlimit(Process::RLIMIT_AS, mem_mb * 1024 * 1024)
    require 'date'; require 'active_support/all'      # prelude deps
    fn = eval(lambda_src)                             # ->(_) { ... }
    w.write(Marshal.dump(fn.call(input))); w.close
  end
  w.close
  begin
    Timeout.timeout(wall_s) { Process.waitpid(pid); Marshal.load(r.read) }
  rescue Timeout::Error
    Process.kill('KILL', pid); raise 'Elo: timeout'
  ensure
    r.close
  end
end
```

Run the child as a low-privilege user; `RLIMIT_AS` is the memory ceiling,
`RLIMIT_CPU` + the wall reaper bound time.

### 5.4 Python

Same shape: a child process with `resource` limits and a `subprocess` timeout.
Keep the child's namespace to the prelude only.

```python
import json, subprocess, sys, resource, textwrap

def run_elo(lambda_src, data, cpu_s=1, mem_mb=128, wall_s=2):
    child = textwrap.dedent(f"""
        import sys, json
        {{prelude}}
        fn = {lambda_src}                 # (lambda _: ...)
        print(json.dumps(fn(json.load(sys.stdin))))
    """)
    def limits():
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_s, cpu_s))
        resource.setrlimit(resource.RLIMIT_AS, (mem_mb * 1024 * 1024,) * 2)
    out = subprocess.run([sys.executable, "-c", child],
                         input=json.dumps(data), capture_output=True, text=True,
                         timeout=wall_s, preexec_fn=limits, check=True)
    return json.loads(out.stdout)
```

`RLIMIT_AS` caps memory, `RLIMIT_CPU` + `timeout=` cap time. Reinforce the data
contract: `_` arrives via JSON, so it is plain data by construction.

### 5.5 PostgreSQL

The emitted SQL is a pure expression over supplied values/columns. Run it:

- as a **dedicated low-privilege, read-only role** (no `INSERT`/`UPDATE`, no
  superuser, restricted `search_path`) — so even a pathological expression can't
  reach data or functions you didn't intend;
- inside a transaction with **`SET LOCAL statement_timeout = '1000ms'`** (the
  timeout lever) and a capped **`work_mem`** (the memory lever);
- with inputs passed as **bound parameters** (`$1`, …), never string-spliced.

```sql
BEGIN;
SET LOCAL statement_timeout = '1000ms';
SET LOCAL work_mem = '16MB';
-- SET LOCAL ROLE elo_readonly;    -- restricted role
SELECT (/* compiled Elo expression, parameters bound */);
COMMIT;
```

---

## 6. Documentation & announcement

**Documentation to change**
- Rewrite the security page around §1–§3 (two layers; the one-paragraph lede in
  §3 as the headline). Replace the flat "What Elo Cannot Do" list with "What Elo
  guarantees" (compile-time + capability) and a prominent "What you must provide"
  (resource sandbox + data contract).
- Fold the existing data-contract and bounded-allocation notes into §2.3.
- Add the "Running Elo safely" cookbook (§5) and land the reference wrappers
  under `contrib/sandboxes/<target>/`, each with a one-line test.
- Rework the bug-bounty rules per §4.
- Cross-link: README → security page; stdlib page primitives that allocate
  (`*` on strings, `padStart/End`) → the resource-sandbox note.

**Announcement**
- Blog post: "How we think about Elo security" — introduce the two-layer model,
  explain why the resource sandbox is the operator's job, link the cookbook.
  Pair it with the 1.0.2 / 1.1.0 notes so the message lands with the fixes.
- Housekeeping: GHSA advisories + CVEs for the reported, in-scope issues, credit
  to **uaaw** and **Atsushi Sada**; point patch-pinned users at 1.0.2.

---

## Open questions for you

1. **Scope wording on "expensive but legal".** ✅ Decided: out of scope as a
   *vulnerability*, paired with a stated **best-effort** commitment to minimize
   occurrence and impact (bounding disproportionate primitives, documenting the
   sandbox). Wording landed in §2.3a and §4.
2. **Reference sandboxes as supported artifacts vs examples.** If they live in
   `contrib/`, do we commit to maintaining/testing them (CI), or clearly label
   them "examples, adapt before use"? Maintained is more credible; it's also a
   standing cost.
3. **A first-class host API?** ✅ Decided: yes, but **later** — ship
   `@enspirit/elo` exporting a `runSandboxed(code, input, limits)` for Node so
   the safe path is the default, not a copy-paste. (See the Klaro Cards note
   below: today's in-house wrapper is a timeout, not a memory+off-thread
   sandbox; the official helper should be worker-based.)
4. **`ELO_MAX_STRING_LENGTH` default.** 10 M characters kills the OOM but is
   still ~10–20 MB; for untrusted input a lower default might be the safer
   out-of-the-box stance, with the env var to raise it. Worth revisiting.
