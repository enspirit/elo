---
title: "Security Release: Elo 1.0.1"
date: 2026-04-20
author: "Bernard Lambeau & Claude"
lead: "Five vulnerabilities fixed in one release. Ruby users should upgrade immediately — the most serious flaw is remote code execution through plain Elo source."
---
**If you use Elo's Ruby target, upgrade to 1.0.1 now.** The other targets
are affected by less-severe issues but we recommend upgrading everywhere.

Over the past week, Atsushi Sada conducted a thorough audit of the Elo
compiler and reported a series of injection vulnerabilities. Fixing the
first led us to a second, which led to a third. 1.0.1 bundles all five
fixes.

## Risk assessment

Here's what was broken, how bad it is, and who's affected.

### 1. Ruby interpolation injection — **critical, Ruby target**

Ruby double-quoted strings interpolate `#{...}`, `#@ivar`, `#@@cvar`,
and `#$gvar`. Elo string literals and subtype-constraint labels were
emitted into double-quoted Ruby strings without escaping `#`. Any
attacker-controlled string containing `#{...}` became executable code
at Ruby runtime.

This Elo source:

```elo
'#{`rm -rf ~`}'
```

...was compiled to this Ruby:

```ruby
"#{`rm -rf ~`}"   # shell exec at runtime
```

**Exploitable by**: anyone who can submit an Elo source string that your
application compiles to Ruby and runs. No special access to the AST API
required. Plain Elo source is enough.

**Severity**: remote code execution.

### 2. JavaScript sandbox escape via meta-properties — **critical, JS target**

Elo's member-access rule restricts `.property` to data types, but
`constructor`, `__proto__`, and `prototype` slipped through. An Elo
expression like `({}).constructor.constructor('return process')()`
reaches the `Function` constructor via the prototype chain and executes
arbitrary JavaScript.

The playground and `eloAdapter.parse()` evaluate compiled JS via
`new Function(...)`, so a malicious expression becomes full RCE in that
process.

**Exploitable by**: anyone who can submit an Elo expression that your
application evaluates via the JS target.

**Severity**: remote code execution.

### 3. Constraint/guard label injection — **medium, JS and Ruby**

Label escaping in the JS emitter and Ruby's single-quoted branch escaped
only `'`, not `\`. A label ending in `\` silently ate the closing quote
and allowed subsequent bytes to be swallowed into the string literal —
a `SyntaxError` today, injectable with a more artful payload.

**Exploitable by**: anyone who controls the text of a subtype constraint
or guard label. Less common than string literals, but possible if labels
are built from user input.

**Severity**: denial of service today, code injection with effort.

### 4. AST-API injection — **medium, all targets**

The Elo parser rejects shell-breakout payloads in identifiers. But the
compiler API (`compileToJavaScript`, `compileToRuby`, `compileToPython`,
`compileToSQL`) accepts ASTs directly. A caller who builds an AST with
attacker-controlled strings in identifier slots (variable names, lambda
parameters, member-access properties, object-literal keys, datapath
segments, `let`-binding names) could inject arbitrary code in any target.

**Exploitable by**: anyone whose application constructs ASTs from
untrusted JSON or similar. Atypical, but real for library consumers.

**Severity**: code injection, target-dependent.

### 5. `fetch()` denylist bypass — **low, defense-in-depth, all targets**

The member-access denylist (fix #2) lived in the IR transform, but
`fetch()` reaches a runtime helper that does dynamic `obj[segment]`
lookup. So `fetch({}, .constructor)` and `fetch({}, 'constructor')`
bypassed the check.

Today this is blocked from full RCE only by a `typeof !== 'object'`
guard inside the fetch helper — structural luck, not principled defense.
A future refactor could reopen it.

**Severity**: defense-in-depth fix. No known live exploit.

## What to do

Upgrade:

```bash
npm install @enspirit/elo@1.0.1
```

If you compile to Ruby with any user-controllable input, **do this now**.
For other targets, the risk profile depends on whether your application
evaluates compiled code from untrusted Elo source — if it does (the
playground, expression editors, dashboards that accept user formulas),
upgrade promptly.

No breaking changes. No API surface changed. The fixes are internal to
the compiler. Expressions and ASTs that were valid in 1.0.0 remain valid
in 1.0.1 — except the ones that were exploiting these bugs, which now
fail at compile or transform time with a clear error.

## Credits

Thanks to [Atsushi Sada](https://github.com/atsushisada) for the
report, the follow-ups, and the patience to keep digging after each fix.
Three of the five vulnerabilities were reported directly; the other two
were uncovered while auditing the same patterns elsewhere in the
codebase.

Safety is one of Elo's four design principles. Receiving a careful
security audit is a gift — it's how the principle becomes real rather
than aspirational. Thank you.

## Verify the fix

Every vulnerability has regression tests — unit tests in
[`test/unit/security.unit.test.ts`](https://github.com/enspirit/elo/blob/main/test/unit/security.unit.test.ts)
and acceptance fixtures under
[`test/fixtures/security/`](https://github.com/enspirit/elo/tree/main/test/fixtures/security)
that run the compiled output in every target and fail if the payload
executes. The full test suite — unit, integration, and acceptance
across four runtimes — passes on every commit.

[Try Elo](/try), read the [full
Changelog](https://github.com/enspirit/elo/blob/main/CHANGELOG.md), or
[open an issue](https://github.com/enspirit/elo/issues).
