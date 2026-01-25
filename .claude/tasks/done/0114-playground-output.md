## Problem to solve

The output of the playground might be misleading because we hardcoded a JSON
prettyprint of the output value, without even telling the user.

## Idea

- It would be more natural to display the output value as Elo code
- And allow the user to output json explicitely

Yet outputting any value as Elo code might require some core work, well tested.
Let's plan that first.
