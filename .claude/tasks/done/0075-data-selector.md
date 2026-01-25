## Problem to solve

I'd like users to be able to parse json data easily.

## Idea

We'll introduce a `Data(x)` type selector, with the following contract:

- if `x` is a string, we'll parse it as a json string
- otherwise, we just return x.

## Todo

- Add the `Data` selector and test it.
- Complete learn (?), reference and stdlib
