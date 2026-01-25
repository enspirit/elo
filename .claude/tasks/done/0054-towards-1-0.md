## Problem to solve

We must plan for an official 1.0 release. But we have to reach a stable point.

Let's break it down to a feasible plan.

## Primary use case

Elo receives JSON input and needs to process it. This requires null + arrays support.

## Roadmap

### JSON first-class support (0.9.x series)

- **54a** - `null` literal (small, unblocks NoVal ergonomics)
- **54b** - Array type + literals (parser, AST, IR, compilers)
- **54c** - Array stdlib (`at`, `length`, `first`, `last`)
- **54d** - Array iteration (`map`, `filter`) — uses existing `fn()`

Design decisions:

- Arrays are heterogeneous (can mix types)
- Access syntax: TBD (`arr[0]` vs `at(arr, 0)`)

### Release infrastructure

- GitHub Actions for 0.9.x npm publish pipeline

### Quality & polish

- [x] Stdlib review with /rigorous
- [x] Run feature improvements on Try page
- /sceptic pass before 1.0
