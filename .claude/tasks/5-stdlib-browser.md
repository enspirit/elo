## Problem to solve

In the website documentation, the list of string functions is unclear in my opinion
(and examples should not include assert calls).

Let's improve it, so that the user can browse the stdlib in a friendler way,
taking into account the fact that the stdlib will grow with other functions
for other types.

## Idea

Separate the language definition (syntax, constants, operators) from the stdlib,
somehow. So that the user can have a brief introduction, and a great reference.

## Post-implem discussion

- That's good. Btw I see that in the Doc tab, we only use the 50% left part of the screen. Fix it.
- In stdlib reference (string functions), I'd like us to always show the signature of each function, and then provide an example with
real values as currently.
- Also use 100% available width, so that example cards can be larger and avoir the example to break over multiple lines.
- Enhance stdlib cards: signature, then description, then example. Larger cards (we currently have 5 columns on my screen, let's go
for 4)
- We currently have `<div class="fn-header"><code class="fn-name">concat</code><span class="fn-sig">(a: String, b: String) →
  String</span></div>`. Break name vs. signature on two different lines.
