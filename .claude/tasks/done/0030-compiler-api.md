## Problem to solve

As we progress towards 1.0, I'd like to come back to our main goal : having an
Elo compiler available in Typescript to eventually use it in Klaro Cards.

The main usage would be:

- I have an Elo expression in a Typescript string, such as `x in SOW ... EOW`
- I want to compile it and have a safe Function instance with an `x` single
  parameter, ideally without relying on `eval`

## Idea

Help me designing the actual use of `elo` npm package to get that.
