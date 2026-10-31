---
title: "How we think about Elo security"
date: 2026-10-31
author: "Bernard Lambeau & Claude"
lead: "Elo security is really two promises, not one. A round of coordinated disclosure pushed us to separate them — and to be honest about the one you have to keep yourself."
---
A recent round of reports — more denial-of-service and sandbox-boundary
findings, under coordinated disclosure — made something clear: we had been
treating "Elo is safe" as a single promise, when it is really two promises with
very different shapes. This post lays out how we now reason about it, what we
guarantee, and the part that is yours to handle. The fixes behind it shipped in
**1.1.0**, and in a conservative **1.0.2** patch for projects pinned below 1.1.

## It depends who writes the code, and whose data it runs on

Elo exists to let people write small programs that run somewhere they don't
control. So the first question is always: do you trust the person who wrote the
expression, and do you trust the data it runs over?

"Trustworthy code over trustworthy data" is a portable calculator — the stakes
are correctness. "Untrustworthy code over arbitrary data" is a hostile-input
compiler — the stakes are your infrastructure. It is the same language, but it
is not the same tool, and the controls you need are different. We design,
document, and triage for the hard end, so the easy end is covered for free.

## What Elo guarantees

Elo touches your systems at two moments, and we make hard promises at both.

**At compile time** — turning an expression into target code — the compiler
always finishes, never crashes uncontrollably, cannot be turned into code
execution *against the compiler itself*, and emits only what the author wrote
(no value can break out of its slot and inject code — including through the AST
API). Any violation of these is a bug we always fix, at the highest priority,
however the input was produced.

**At runtime, by construction** — the emitted code is a pure function of its
input. It cannot `eval`, cannot do I/O, cannot reach host globals, and cannot
reach host-runtime internals such as the JavaScript prototype chain. That is the
"it's sandboxed" promise, and we keep it.

## What you must provide

Here is the honest part. Elo gives you a **capability sandbox**, not a
**resource sandbox**. A legal Elo expression has no loops and no recursion — but
it can still be *expensive* over the data you give it. We bound the primitives
that let a short expression allocate out of proportion (array repeat is refused;
string repeat and padding are capped by `ELO_MAX_STRING_LENGTH`), and we will
keep making that best effort — but bounding primitives does not bound total
cost, and we will never claim it does.

So: **run compiled Elo the way you would run any untrusted computation — in an
isolated context, under a memory ceiling and a wall-clock timeout — and pass it
plain data, not live host objects.** We now ship copy-paste reference sandboxes
for Node, the browser, Ruby, Python, and PostgreSQL. See the new
[Running Elo safely](/running-safely) guide and the `contrib/sandboxes/`
directory.

## The bug bounty, sharpened

The program now scopes severity by which trust boundary a report crosses. In
scope: anything that lets an untrusted expression execute code in the compiler,
inject into the output, escape the runtime capability sandbox, hang the
compiler, or trigger disproportionate allocation from a short expression. Out of
scope, by design: a legal expression that is simply expensive over the data
provided, resource exhaustion a memory-and-timeout sandbox would contain, and
passing non-data host objects as input. Details are on the
[security page](/security).

## Credits

Thanks to **uaaw** and **Atsushi Sada** for the reports behind this round of
hardening, handled under coordinated disclosure. If you find something, we want
to hear from you — `security@enspirit.dev`.
