# Elo Python Compiler — Technical Documentation

## Overview

Elo now compiles to Python, making it the fourth target language alongside JavaScript, Ruby, and PostgreSQL SQL. The compiler transforms Elo expressions into idiomatic Python code while maintaining semantic equivalence with all other targets.

---

## Compiler Architecture

### File Structure

```
src/
├── compilers/
│   └── python.ts      # Main Python compiler
├── bindings/
│   └── python.ts      # stdlib bindings for Python
└── runtime.ts         # Python helper functions (PY_HELPERS)
```

### Compilation Pipeline

1. **Parse**: Source code → AST (`parser.ts`)
2. **Transform**: AST → Typed IR (`transform.ts`) — infers types, rewrites operators as function calls
3. **Emit**: IR → Python code (`compilers/python.ts`) — uses `StdLib` for type-based dispatch

---

## Core Constructs

### 1. Literals

| Elo | Python | Description |
|-----|--------|-------------|
| `42` | `42` | Integer |
| `3.14` | `3.14` | Float |
| `true` | `True` | Boolean true |
| `false` | `False` | Boolean false |
| `null` | `None` | Null value |
| `'hello'` | `"hello"` | String |
| `[1, 2, 3]` | `[1, 2, 3]` | Array |
| `{a: 1, b: 2}` | `{"a": 1, "b": 2}` | Object (dict) |

**Compilation example:**
```
Elo:    true && false
Python: (lambda _: True and False)
```

### 2. Arithmetic Operators

| Elo | Python | Description |
|-----|--------|-------------|
| `+` | `+` | Addition |
| `-` | `-` | Subtraction |
| `*` | `*` | Multiplication |
| `/` | `/` | Division |
| `%` | `%` | Modulo |
| `^` | `**` | Exponentiation |

**Important**: Elo uses `^` for power, while Python uses `**`. The compiler translates automatically.

```
Elo:    2 ^ 10
Python: (lambda _: 2 ** 10)
# Result: 1024
```

### 3. Logical Operators

| Elo | Python | Description |
|-----|--------|-------------|
| `&&` | `and` | Logical AND |
| `\|\|` | `or` | Logical OR |
| `!` | `not` | Logical NOT |

```
Elo:    true && !false
Python: (lambda _: True and not False)
```

### 4. Comparison Operators

| Elo | Python |
|-----|--------|
| `<`, `>`, `<=`, `>=` | Identical |
| `==`, `!=` | Identical |

---

## Let Expressions (Local Variables)

Elo uses functional let expressions for declaring local variables. In Python, this is implemented using the **walrus operator** (`:=`), available since Python 3.8.

**Elo syntax:**
```
let x = 10, y = 20 in x + y
```

**Python compilation:**
```python
(lambda _: (x := 10, y := 20, x + y)[-1])
```

**How it works:**
1. `(x := 10, y := 20, x + y)` — tuple where walrus operator assigns values
2. `[-1]` — takes the last element of the tuple (the expression result)
3. Everything is wrapped in `lambda _` to match Elo's pattern

**Example with calculations:**
```
Elo:    let price = 100, tax = 0.21 in price * (1 + tax)
Python: (lambda _: (price := 100, tax := 0.21, price * (1 + tax))[-1])
# Result: 121.0
```

---

## Lambda Functions

Elo supports anonymous functions with syntax `fn(params ~> body)` or shorthand `params ~> body`.

**Full syntax:**
```
fn(x ~> x * 2)
```

**Shorthand syntax:**
```
x ~> x * 2
```

**Python compilation:**
```python
lambda x: x * 2
```

**Example with map:**
```
Elo:    map([1, 2, 3], fn(x ~> x * 2))
Python: (lambda _: list(map(lambda x: x * 2, [1, 2, 3])))
# Result: [2, 4, 6]
```

---

## Data Access

### The `_` Variable (Input)

Every Elo expression receives input data through the `_` variable. In Python, it's passed as the lambda argument.

```
Elo:    _.price * 1.21
Python: (lambda _: _.get("price") * 1.21)
```

**Important**: The compiler uses `.get()` for safe dict access, returning `None` for missing keys instead of raising an exception.

### DataPath (Data Paths)

DataPath is a special syntax for navigating data structures.

```
Elo:    .user.address.city
Python: ["user", "address", "city"]
```

Used with the `fetch()` function:
```
Elo:    fetch(data, .user.name)
Python: (lambda _: kFetch(data, ["user", "name"]))
```

---

## Pipe Operator (`|>`)

The pipe operator allows writing transformation chains left-to-right (Elixir-style).

```
Elo:    [1, 2, 3] |> map(x ~> x * 2) |> filter(x ~> x > 2)
```

**Python compilation (nested calls):**
```python
(lambda _: list(filter(lambda x: x > 2, list(map(lambda x: x * 2, [1, 2, 3])))))
```

**Result:** `[4, 6]`

---

## Alternative Operator (`|`)

The alternative operator returns the first non-None value from a chain.

```
Elo:    _.value | _.default | 0
```

**Python compilation:**
```python
(lambda _: (_alt0) if (_alt0 := _.get("value")) is not None else
           ((_alt1) if (_alt1 := _.get("default")) is not None else (0)))
```

**How it works:**
1. Check `_.value`, store in `_alt0`
2. If `_alt0 is not None`, return it
3. Otherwise check `_.default`, store in `_alt1`
4. If `_alt1 is not None`, return it
5. Otherwise return `0`

---

## Temporal Types

### Dates and DateTime

| Elo | Python | Description |
|-----|--------|-------------|
| `TODAY` | `_elo_dt(now.year, now.month, now.day)` | Current date |
| `NOW` | `_dt.datetime.now()` | Current datetime |
| `D2024-01-15` | `_elo_dt(2024, 1, 15)` | Date literal |
| `D2024-01-15T10:30:00Z` | `_elo_dt(2024, 1, 15, 10, 30, 0)` | Datetime literal |

**Helper function `_elo_dt`:**
```python
def _elo_dt(y, mo, d, h=0, mi=0, s=0):
    return _dt.datetime(y, mo, d, h, mi, s)
```

### Durations

ISO8601 durations compile to the `EloDuration` class:

```
Elo:    P1D          # 1 day
Python: EloDuration.from_iso("P1D")

Elo:    PT2H30M      # 2 hours 30 minutes
Python: EloDuration.from_iso("PT2H30M")

Elo:    P1Y2M3D      # 1 year 2 months 3 days
Python: EloDuration.from_iso("P1Y2M3D")
```

### Date Arithmetic

```
Elo:    TODAY + P1D
Python: (lambda _: kAdd(_elo_dt(...), EloDuration.from_iso("P1D")))
```

The `kAdd` helper handles datetime + duration addition:
```python
def kAdd(l, r):
    if isinstance(l, _dt.datetime) and isinstance(r, EloDuration):
        return _elo_dt_plus(l, r)
    if isinstance(l, EloDuration) and isinstance(r, _dt.datetime):
        return _elo_dt_plus(r, l)
    if isinstance(l, EloDuration) and isinstance(r, EloDuration):
        return l.plus(r)
    return l + r
```

### Extraction Functions

| Elo | Python |
|-----|--------|
| `year(date)` | `date.year` |
| `month(date)` | `date.month` |
| `day(date)` | `date.day` |
| `hour(datetime)` | `datetime.hour` |
| `minute(datetime)` | `datetime.minute` |

### Period Boundaries

| Elo | Python |
|-----|--------|
| `SOD(d)` | `_elo_start_of_day(d)` |
| `EOD(d)` | `_elo_end_of_day(d)` |
| `SOW(d)` | `_elo_start_of_week(d)` |
| `EOW(d)` | `_elo_end_of_week(d)` |
| `SOM(d)` | `_elo_start_of_month(d)` |
| `EOM(d)` | `_elo_end_of_month(d)` |
| `SOQ(d)` | `_elo_start_of_quarter(d)` |
| `EOQ(d)` | `_elo_end_of_quarter(d)` |
| `SOY(d)` | `_elo_start_of_year(d)` |
| `EOY(d)` | `_elo_end_of_year(d)` |

---

## Standard Library Functions

### Array Iteration

| Elo | Python |
|-----|--------|
| `map(arr, fn)` | `list(map(fn, arr))` |
| `filter(arr, fn)` | `list(filter(fn, arr))` |
| `reduce(arr, init, fn)` | `functools.reduce(fn, arr, init)` |
| `any(arr, fn)` | `any(map(fn, arr))` |
| `all(arr, fn)` | `all(map(fn, arr))` |

**Example:**
```
Elo:    reduce([1, 2, 3, 4, 5], 0, fn(acc, x ~> acc + x))
Python: (lambda _: functools.reduce(lambda acc, x: acc + x, [1, 2, 3, 4, 5], 0))
# Result: 15
```

### String Functions

| Elo | Python |
|-----|--------|
| `length(s)` | `len(s)` |
| `upper(s)` | `s.upper()` |
| `lower(s)` | `s.lower()` |
| `trim(s)` | `s.strip()` |
| `startsWith(s, prefix)` | `s.startswith(prefix)` |
| `endsWith(s, suffix)` | `s.endswith(suffix)` |
| `contains(s, sub)` | `sub in s` |
| `split(s, sep)` | `kSplit(s, sep)` |
| `join(arr, sep)` | `sep.join(arr)` |
| `replace(s, old, new)` | `s.replace(old, new, 1)` |
| `replaceAll(s, old, new)` | `s.replace(old, new)` |

### Array Functions

| Elo | Python |
|-----|--------|
| `first(arr)` | `kFirst(arr)` |
| `last(arr)` | `kLast(arr)` |
| `at(arr, idx)` | `kAt(arr, idx)` |
| `reverse(arr)` | `list(reversed(arr))` |
| `length(arr)` | `len(arr)` |
| `isEmpty(arr)` | `len(arr) == 0` |

### Data Functions

| Elo | Python |
|-----|--------|
| `fetch(data, path)` | `kFetch(data, path)` |
| `patch(data, path, value)` | `kPatch(data, path, value)` |
| `merge(a, b)` | `{**a, **b}` |
| `deepMerge(a, b)` | `kDeepMerge(a, b)` |

### Math Functions

| Elo | Python |
|-----|--------|
| `abs(n)` | `abs(n)` |
| `round(n)` | `round(n)` |
| `floor(n)` | `math.floor(n)` |
| `ceil(n)` | `math.ceil(n)` |

---

## Guard Expressions

Guards allow adding assertions to expressions.

```
Elo:    guard x > 0 in x * 2
```

**Python compilation:**
```python
(lambda _: (kAssert(x > 0, "guard failed"), x * 2)[-1])
```

**Helper kAssert:**
```python
def kAssert(cond, msg="Assertion failed"):
    if not cond: raise Exception(msg)
    return True
```

**With custom message:**
```
Elo:    guard price > 0 as 'Price must be positive' in price * quantity
```

---

## Type Selectors

Type selectors allow parsing and converting values.

| Elo | Python | Description |
|-----|--------|-------------|
| `Int(x)` | `int(x)` | Convert to integer |
| `Float(x)` | `float(x)` | Convert to float |
| `String(x)` | `str(x)` or `kString(x)` | Convert to string |
| `Bool(x)` | `kBool(x)` | Convert to boolean |
| `Date(x)` | `kParseDate(x)` | Parse date |
| `Datetime(x)` | `kParseDatetime(x)` | Parse datetime |
| `Duration(x)` | `EloDuration.from_iso(x)` | Parse ISO8601 duration |
| `Data(x)` | `kData(x)` | Parse JSON |

**Example:**
```
Elo:    Int('42') + Float('3.14')
Python: (lambda _: int("42") + float("3.14"))
# Result: 45.14
```

---

## Type Definitions

Elo supports Finitio-like schemas for data validation.

### Basic Syntax

```
Elo:    let Person = { name: String, age: Int } in data |> Person
```

**Python compilation:**
```python
(lambda _: (
    _p_Person := pSchema([
        ("name", pString, False),  # (key, parser, optional?)
        ("age", pInt, False)
    ], "closed", None),
    Person := lambda v: pUnwrap(_p_Person(v, '')),
    Person(data)
)[-1])
```

### How Combinators Work

Python lambdas are limited to single expressions, so we use **combinator-style**:

1. **pSchema** — creates parser for objects
2. **pArray** — creates parser for arrays
3. **pUnion** — creates parser for union types
4. **pSubtype** — adds constraint to base type

**pSchema example:**
```python
def pSchema(props, extras_mode, extras_parser=None):
    known_keys = [p[0] for p in props]
    def parser(v, p):
        if not isinstance(v, dict):
            return pFail(p, "expected object, got " + type(v).__name__)
        o = {}
        for key, prop_parser, optional in props:
            val = v.get(key)
            if optional and val is None:
                continue
            r = prop_parser(val, p + "." + key)
            if not r["success"]:
                return pFail(p, None, [r])
            o[key] = r["value"]
        # ... extras handling ...
        return pOk(o, p)
    return parser
```

### Constraints

```
Elo:    let PositiveInt = Int(i | i > 0) in 42 |> PositiveInt
```

**Compilation:**
```python
(lambda _: (
    _p_PositiveInt := pSubtype(pInt, [
        ("constraint 'i > 0' failed", lambda i: i > 0)
    ]),
    PositiveInt := lambda v: pUnwrap(_p_PositiveInt(v, '')),
    PositiveInt(42)
)[-1])
```

### Optional Fields

```
Elo:    let Config = { name: String, debug?: Bool } in data |> Config
```

The third parameter in the tuple (`True`) indicates optionality:
```python
pSchema([
    ("name", pString, False),   # required
    ("debug", pBool, True)      # optional
], "closed", None)
```

### Union Types

```
Elo:    let StringOrInt = String | Int in value |> StringOrInt
```

```python
pUnion([pString, pInt])
```

### Arrays

```
Elo:    let Numbers = [Int] in data |> Numbers
```

```python
pArray(pInt)
```

---

## Prelude (Runtime Library)

The prelude contains all helper functions needed to execute compiled code.

**Getting the prelude:**
```bash
./bin/eloc --prelude-only -t python
```

**Prelude contents:**
- `import math, functools, datetime as _dt, re`
- `class EloDuration` — class for working with durations
- Helper functions (`kAssert`, `kEq`, `kFetch`, `kPatch`, etc.)
- Parsers (`pOk`, `pFail`, `pString`, `pInt`, `pSchema`, etc.)
- Datetime helpers (`_elo_dt`, `_elo_start_of_day`, etc.)

---

## Executing Python Code

### CLI

```bash
# Compilation
./bin/eloc -e "2 + 3 * 4" -t python
# Output: (lambda _: 2 + 3 * 4)

# Compilation with prelude
./bin/eloc -e "TODAY + P1D" -t python -p

# Prelude only
./bin/eloc --prelude-only -t python
```

### Execution

```bash
# Compile and execute
(./bin/eloc --prelude-only -t python; ./bin/eloc -e "2 ^ 10" -t python; echo "(None)") | python3
# Output: 1024
```

---

## Implementation Details

### 1. Walrus Operator (`:=`)

Requires **Python 3.8+**. Allows assignments inside expressions.

### 2. Everything is an Expression

Python has restrictions on statements inside lambda. Solutions:
- `let` → walrus + tuple + `[-1]`
- `guard` → `kAssert()` helper
- type definitions → combinator parsers

### 3. Safe Member Access

Instead of `_.field` (which raises `KeyError`), we use `_.get("field")`, returning `None`.

### 4. Operator Precedence

The compiler automatically adds parentheses where needed:

```
Elo:    (2 + 3) * 4
Python: (2 + 3) * 4  # parentheses preserved

Elo:    2 + 3 * 4
Python: 2 + 3 * 4    # no parentheses needed
```

---

## Testing

### Unit Tests

```bash
npm run test:unit
# Includes 30 tests for Python compiler
```

### Acceptance Tests (fixtures)

```bash
# Unix
python3 test/acceptance/test-python.sh

# Windows
PYTHON_CMD=python bash test/acceptance/test-python.sh
```

44 fixture files verify semantic equivalence of Python code.

---

## Limitations

1. **Python 3.8+** — required for walrus operator
2. **Single expression** — all constructs must be expressions
3. **No generators** — we use `list(map(...))` instead of list comprehensions for consistency

---

## Examples

### Tax Calculation
```
Elo:    let price = _.price, tax = 0.21 in price * (1 + tax)
Python: (lambda _: (price := _.get("price"), tax := 0.21, price * (1 + tax))[-1])
```

### Filter and Transform
```
Elo:    _.items |> filter(x ~> x.active) |> map(x ~> x.name)
Python: (lambda _: list(map(lambda x: x.get("name"),
         list(filter(lambda x: x.get("active"), _.get("items"))))))
```

### Data Validation
```
Elo:    let User = {
          name: String,
          email: String(e | contains(e, '@')),
          age: Int(a | a >= 18)
        } in data |> User
```

### Working with Dates
```
Elo:    let due = _.dueDate |> Date in
        guard due > TODAY in
        due - TODAY |> inDays
```
