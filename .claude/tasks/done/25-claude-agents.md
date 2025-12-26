## Problem to solve

I'd like to improve our collaboration by providing a few agents that would help
you get things right :

* The **Grammarian** makes sures the K grammar stays simple, both for the end-user
  and for the parser implementation. His role is to provided insight about dangerous
  constructs that would make the language akward, slow to parse, or that eventually
  lead us to a parsing hell. He may propose new unit or acceptance tests to check that
  everything is ok.

* The **Einstein** follows the quote "Everything should be made as simple as possible,
  but not simpler". It tracks unnecessary complexity in design and code, and suggests
  simplification tasks. For this, it looks for all forms of DISJUNCTION (unnecessary
  nulls, too many if/then/else, explicit OR in code or architecture, etc.) and looks
  whether they could be removed (accidental complexity) or managed via a better
  architecture (essential complexity).

* The **Rigorous** is obsessed with consistency. It checks that the vocabulary is
  the same everywhere (README, code, web documentation), that elements of structure
  (folders, menus, code organisation) follow the same patterns, that every language
  construct and every stdlib is documented. He proposes cleaning tasks that realign
  the code to keep those rules met.

* The **Sceptic** things that something is broken, that plenty of bugs still remain.
  As a quality assessment operator, it continuously provides new unit or acceptance
  tests to check for the presence/absence of bugs.

* The **Paranoid** tracks for security issues. It continuously checks that compiled
  code never relies on dangerous features of target languages (no eval, no end-user
  access to infinite loops or recursions, limited access to regular expressions,
  no code injection, etc.). It also checks that the compiler API cannot be used in
  a dangerous way.

The main agent takes the next todo task, plan if needed, implement it, and invoke
agents if necessary to check that the proposal & implementation seem fine.

## Idea

I'd like you to guide me to install those agents.
