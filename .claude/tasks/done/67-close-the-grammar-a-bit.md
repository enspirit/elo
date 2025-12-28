## Problem to solve

Currently `let X = 2 in X` is allowed. I wouldn't do that.

We shouldn't allow user variables to start with a capital letter, because that
will is reserved for Types and Selectors.

## Idea

Close the grammar a bit. Ask the sceptic to find other examples of rules that
make the grammar too open and prevents us from introducing useful constructs
later.
