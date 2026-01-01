## Problem to solve

When we've changed the Elo semantics to always include a wrapper function
(task 84, commit 8438bca028b725c5361b3fba361a73631a4f52a1), we've broken the
Try playground.

`Run` should always execute the function on user input (even if none).

## Idea

Fix it.
