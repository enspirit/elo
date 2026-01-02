## Problem to solve

I'd like to distinguish various tools over types :

* Check a value belongs to a type
* Assert a value belongs to a type
* Dress/coerce/parse a value as a type's value falling back to `null`
* Dress/coerce/parse a value failing in case of error

## Idea

A type selector invocation would have a modifier character:

Check :

```elo
Date?(D2025-12-01) # true
Date?('2025-12-01') # false
Date?('elo') # false
```

Assert :

```elo
Date!(D2025-12-01) # true
Date!('2025-12-01') # fails
Date!('elo') # fails
```

Dress (falling back to null) :

```elo
Date(D2025-12-01) # D2025-12-01
Date('2025-12-01') # D2025-12-01
Date('elo') # null
```


Dress (falling back to fail) :

```elo
Date<>(D2025-12-01) # D2025-12-01
Date<>('2025-12-01') # D2025-12-01
Date<>('elo') # fail
```

## Brainstorm

* Can we conflate `Date!` and `Date<>` into only one ?
* Some forms can be seen as syntactic sugar. For instance `Date<>('elo') is Date('elo')|fail`,
  and same for `Date!('elo')`

