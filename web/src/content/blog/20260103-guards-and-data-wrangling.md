---
title: "Guards, Checks, and Data Wrangling"
date: 2026-01-03
author: "Bernard Lambeau & Claude"
lead: "New runtime validation primitives and improved data extraction make Elo more expressive for real-world data pipelines."
---

The day after the 0.9.x release, we couldn't stop. Here's what landed in Elo today.

## Guards and Checks

While working on Elo, one thing kept bugging me: we had `assert()` for tests, but no way
to express preconditions and postconditions in real programs. Assertions live at the statement
level, but Elo is purely expression-based.

Enter `guard` and `check`:

```elo
let user = { age: 25 } in
  guard
    positive: user.age > 0,
    adult: user.age >= 18
  in
    'Welcome!'
```

Guards are preconditions—they validate input before computation. If any condition fails,
you get a clear error message with the constraint label.

Checks work the same way but express postconditions:

```elo
let result = [1, 2, 3] in
  check non_empty: length(result) > 0 in
    result
```

### Pipe-Style Guards

Since Elo loves pipes, guards fit naturally into data pipelines:

```elo
[1, 2, 3]
  |> guard(d | 'must not be empty': length(d) > 0)
  |> map(x ~> x * 2)
  |> guard(r | has_items: length(r) > 0)
```

The `guard(x | condition)` form binds the piped value to `x` for the condition check,
then passes it through unchanged. It's validation as a pipeline step.

### Combining Guards, Lets, and Checks

You can nest guards and checks within let expressions:

```elo
let data = [1, 2, 3] in
  guard 'valid input': length(data) > 0 in
    let result = map(data, x ~> x * 2) in
      check non_empty: length(result) > 0 in
        result
```

This reads almost like a specification: validate input, compute, validate output, return.

## Labeled Constraints

Guards share syntax with an enhancement we made to subtype constraints. You can now
label individual constraints for better error messages:

```elo
let
  Positive = Int(i | positive: i > 0),
  Even = Int(i | even: i % 2 == 0),
  PosEven = Int(i | positive: i > 0, even: i % 2 == 0)
in
  6 |> PosEven  # passes both constraints
```

When a constraint fails, the error message includes the label:

```
constraint 'positive' failed
```

Or use string messages for even clearer errors:

```elo
let Adult = Int(a | 'must be 18 or older': a >= 18)
in 25 |> Adult
```

Passing `15` instead would produce: `Error: must be 18 or older`.

## Polymorphic Fetch

Data extraction got more powerful. Instead of writing:

```elo
let data = { user: { name: 'Alice', email: 'alice@example.com' } } in {
  x: fetch(data, .user.name),
  y: fetch(data, .user.email)
}
```

You can now write:

```elo
let data = { user: { name: 'Alice', email: 'alice@example.com' } } in
  fetch(data, {
    x: .user.name,
    y: .user.email
  })
```

Same result, less noise. It also works with lists:

```elo
let data = { scores: [85, 92, 78] } in
  fetch(data, [.scores.0, .scores.1, .scores.2])
    |> reduce(0, fn(sum, x ~> sum + x))
```

Extract multiple paths in one call, then pipe the result to further processing.

## What's Next

These features make Elo more practical for data validation and transformation pipelines.
Combined with the Finitio-style type system, you can now express quite sophisticated
data contracts:

```elo
let
  Email = String(s | 'invalid email': contains(s, '@')),
  Age = Int(a | positive: a > 0, reasonable: a < 150),
  Person = { email: Email, age: Age },
  input = { email: 'alice@example.com', age: '30' },
  person = Person(input)
in
  'Hello, ' + person.email
```

The vision is coming together: a simple, safe, portable expression language for data
manipulation. We're getting there.

[Try the new features](/try) or check the [Reference](/reference) for details.
