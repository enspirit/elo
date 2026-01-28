# Python компилятор Elo — Техническая документация

## Обзор

Elo теперь компилируется в Python, что делает его четвёртым целевым языком наряду с JavaScript, Ruby и PostgreSQL SQL. Компилятор преобразует выражения Elo в идиоматический Python-код, сохраняя семантическую эквивалентность со всеми остальными таргетами.

---

## Архитектура компилятора

### Файловая структура

```
src/
├── compilers/
│   └── python.ts      # Основной компилятор Python
├── bindings/
│   └── python.ts      # Биндинги stdlib для Python
└── runtime.ts         # Python helper-функции (PY_HELPERS)
```

### Pipeline компиляции

1. **Parse**: Исходный код → AST (`parser.ts`)
2. **Transform**: AST → Typed IR (`transform.ts`) — выводит типы, переписывает операторы как вызовы функций
3. **Emit**: IR → Python код (`compilers/python.ts`) — использует `StdLib` для диспатчинга по типам

---

## Основные конструкции

### 1. Литералы

| Elo | Python | Описание |
|-----|--------|----------|
| `42` | `42` | Целое число |
| `3.14` | `3.14` | Число с плавающей точкой |
| `true` | `True` | Логическое истина |
| `false` | `False` | Логическое ложь |
| `null` | `None` | Пустое значение |
| `'hello'` | `"hello"` | Строка |
| `[1, 2, 3]` | `[1, 2, 3]` | Массив |
| `{a: 1, b: 2}` | `{"a": 1, "b": 2}` | Объект (словарь) |

**Пример компиляции:**
```
Elo:    true && false
Python: (lambda _: True and False)
```

### 2. Арифметические операторы

| Elo | Python | Описание |
|-----|--------|----------|
| `+` | `+` | Сложение |
| `-` | `-` | Вычитание |
| `*` | `*` | Умножение |
| `/` | `/` | Деление |
| `%` | `%` | Остаток от деления |
| `^` | `**` | Возведение в степень |

**Важно**: Elo использует `^` для степени, а Python использует `**`. Компилятор автоматически транслирует.

```
Elo:    2 ^ 10
Python: (lambda _: 2 ** 10)
# Результат: 1024
```

### 3. Логические операторы

| Elo | Python | Описание |
|-----|--------|----------|
| `&&` | `and` | Логическое И |
| `\|\|` | `or` | Логическое ИЛИ |
| `!` | `not` | Логическое НЕ |

```
Elo:    true && !false
Python: (lambda _: True and not False)
```

### 4. Операторы сравнения

| Elo | Python |
|-----|--------|
| `<`, `>`, `<=`, `>=` | Идентично |
| `==`, `!=` | Идентично |

---

## Let-выражения (Локальные переменные)

Elo использует функциональные let-выражения для объявления локальных переменных. В Python это реализовано через **walrus operator** (`:=`), доступный с Python 3.8.

**Синтаксис Elo:**
```
let x = 10, y = 20 in x + y
```

**Компиляция в Python:**
```python
(lambda _: (x := 10, y := 20, x + y)[-1])
```

**Как это работает:**
1. `(x := 10, y := 20, x + y)` — кортеж, где walrus operator присваивает значения
2. `[-1]` — берём последний элемент кортежа (результат выражения)
3. Всё обёрнуто в `lambda _` для соответствия паттерну Elo

**Пример с вычислениями:**
```
Elo:    let price = 100, tax = 0.21 in price * (1 + tax)
Python: (lambda _: (price := 100, tax := 0.21, price * (1 + tax))[-1])
# Результат: 121.0
```

---

## Лямбда-функции

Elo поддерживает анонимные функции с синтаксисом `fn(params ~> body)` или сокращённо `params ~> body`.

**Полный синтаксис:**
```
fn(x ~> x * 2)
```

**Сокращённый синтаксис:**
```
x ~> x * 2
```

**Компиляция в Python:**
```python
lambda x: x * 2
```

**Пример с map:**
```
Elo:    map([1, 2, 3], fn(x ~> x * 2))
Python: (lambda _: list(map(lambda x: x * 2, [1, 2, 3])))
# Результат: [2, 4, 6]
```

---

## Доступ к данным

### Переменная `_` (Input)

Каждое выражение Elo получает входные данные через переменную `_`. В Python она передаётся как аргумент лямбды.

```
Elo:    _.price * 1.21
Python: (lambda _: _.get("price") * 1.21)
```

**Важно**: Компилятор использует `.get()` для безопасного доступа к полям словаря, что возвращает `None` для отсутствующих ключей вместо выброса исключения.

### DataPath (Пути к данным)

DataPath — это специальный синтаксис для навигации по структурам данных.

```
Elo:    .user.address.city
Python: ["user", "address", "city"]
```

Используется с функцией `fetch()`:
```
Elo:    fetch(data, .user.name)
Python: (lambda _: kFetch(data, ["user", "name"]))
```

---

## Pipe-оператор (`|>`)

Pipe-оператор позволяет писать цепочки преобразований слева направо (как в Elixir).

```
Elo:    [1, 2, 3] |> map(x ~> x * 2) |> filter(x ~> x > 2)
```

**Компиляция в Python (вложенные вызовы):**
```python
(lambda _: list(filter(lambda x: x > 2, list(map(lambda x: x * 2, [1, 2, 3])))))
```

**Результат:** `[4, 6]`

---

## Alternative-оператор (`|`)

Оператор альтернативы возвращает первое не-None значение из цепочки.

```
Elo:    _.value | _.default | 0
```

**Компиляция в Python:**
```python
(lambda _: (_alt0) if (_alt0 := _.get("value")) is not None else
           ((_alt1) if (_alt1 := _.get("default")) is not None else (0)))
```

**Как это работает:**
1. Проверяем `_.value`, сохраняем в `_alt0`
2. Если `_alt0 is not None`, возвращаем его
3. Иначе проверяем `_.default`, сохраняем в `_alt1`
4. Если `_alt1 is not None`, возвращаем его
5. Иначе возвращаем `0`

---

## Временные типы (Temporal)

### Даты и DateTime

| Elo | Python | Описание |
|-----|--------|----------|
| `TODAY` | `_elo_dt(now.year, now.month, now.day)` | Текущая дата |
| `NOW` | `_dt.datetime.now()` | Текущие дата и время |
| `D2024-01-15` | `_elo_dt(2024, 1, 15)` | Литерал даты |
| `D2024-01-15T10:30:00Z` | `_elo_dt(2024, 1, 15, 10, 30, 0)` | Литерал datetime |

**Helper-функция `_elo_dt`:**
```python
def _elo_dt(y, mo, d, h=0, mi=0, s=0):
    return _dt.datetime(y, mo, d, h, mi, s)
```

### Длительности (Duration)

ISO8601 длительности компилируются в класс `EloDuration`:

```
Elo:    P1D          # 1 день
Python: EloDuration.from_iso("P1D")

Elo:    PT2H30M      # 2 часа 30 минут
Python: EloDuration.from_iso("PT2H30M")

Elo:    P1Y2M3D      # 1 год 2 месяца 3 дня
Python: EloDuration.from_iso("P1Y2M3D")
```

### Арифметика с датами

```
Elo:    TODAY + P1D
Python: (lambda _: kAdd(_elo_dt(...), EloDuration.from_iso("P1D")))
```

Helper `kAdd` обрабатывает сложение datetime + duration:
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

### Функции извлечения

| Elo | Python |
|-----|--------|
| `year(date)` | `date.year` |
| `month(date)` | `date.month` |
| `day(date)` | `date.day` |
| `hour(datetime)` | `datetime.hour` |
| `minute(datetime)` | `datetime.minute` |

### Границы периодов

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

## Функции стандартной библиотеки

### Итерация по массивам

| Elo | Python |
|-----|--------|
| `map(arr, fn)` | `list(map(fn, arr))` |
| `filter(arr, fn)` | `list(filter(fn, arr))` |
| `reduce(arr, init, fn)` | `functools.reduce(fn, arr, init)` |
| `any(arr, fn)` | `any(map(fn, arr))` |
| `all(arr, fn)` | `all(map(fn, arr))` |

**Пример:**
```
Elo:    reduce([1, 2, 3, 4, 5], 0, fn(acc, x ~> acc + x))
Python: (lambda _: functools.reduce(lambda acc, x: acc + x, [1, 2, 3, 4, 5], 0))
# Результат: 15
```

### Работа со строками

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

### Работа с массивами

| Elo | Python |
|-----|--------|
| `first(arr)` | `kFirst(arr)` |
| `last(arr)` | `kLast(arr)` |
| `at(arr, idx)` | `kAt(arr, idx)` |
| `reverse(arr)` | `list(reversed(arr))` |
| `length(arr)` | `len(arr)` |
| `isEmpty(arr)` | `len(arr) == 0` |

### Работа с данными

| Elo | Python |
|-----|--------|
| `fetch(data, path)` | `kFetch(data, path)` |
| `patch(data, path, value)` | `kPatch(data, path, value)` |
| `merge(a, b)` | `{**a, **b}` |
| `deepMerge(a, b)` | `kDeepMerge(a, b)` |

### Математические функции

| Elo | Python |
|-----|--------|
| `abs(n)` | `abs(n)` |
| `round(n)` | `round(n)` |
| `floor(n)` | `math.floor(n)` |
| `ceil(n)` | `math.ceil(n)` |

---

## Guard-выражения

Guard позволяют добавлять проверки (assertions) в выражения.

```
Elo:    guard x > 0 in x * 2
```

**Компиляция в Python:**
```python
(lambda _: (kAssert(x > 0, "guard failed"), x * 2)[-1])
```

**Helper kAssert:**
```python
def kAssert(cond, msg="Assertion failed"):
    if not cond: raise Exception(msg)
    return True
```

**С пользовательским сообщением:**
```
Elo:    guard price > 0 as 'Price must be positive' in price * quantity
```

---

## Type Selectors (Селекторы типов)

Селекторы типов позволяют парсить и конвертировать значения.

| Elo | Python | Описание |
|-----|--------|----------|
| `Int(x)` | `int(x)` | Преобразование в целое |
| `Float(x)` | `float(x)` | Преобразование в float |
| `String(x)` | `str(x)` или `kString(x)` | Преобразование в строку |
| `Bool(x)` | `kBool(x)` | Преобразование в boolean |
| `Date(x)` | `kParseDate(x)` | Парсинг даты |
| `Datetime(x)` | `kParseDatetime(x)` | Парсинг datetime |
| `Duration(x)` | `EloDuration.from_iso(x)` | Парсинг ISO8601 duration |
| `Data(x)` | `kData(x)` | Парсинг JSON |

**Пример:**
```
Elo:    Int('42') + Float('3.14')
Python: (lambda _: int("42") + float("3.14"))
# Результат: 45.14
```

---

## Type Definitions (Определения типов)

Elo поддерживает Finitio-подобные схемы для валидации данных.

### Базовый синтаксис

```
Elo:    let Person = { name: String, age: Int } in data |> Person
```

**Компиляция в Python:**
```python
(lambda _: (
    _p_Person := pSchema([
        ("name", pString, False),  # (ключ, парсер, optional?)
        ("age", pInt, False)
    ], "closed", None),
    Person := lambda v: pUnwrap(_p_Person(v, '')),
    Person(data)
)[-1])
```

### Как работают комбинаторы

Python lambdas ограничены одним выражением, поэтому используется **combinator-style**:

1. **pSchema** — создаёт парсер для объектов
2. **pArray** — создаёт парсер для массивов
3. **pUnion** — создаёт парсер для union-типов
4. **pSubtype** — добавляет constraint к базовому типу

**Пример pSchema:**
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
        # ... обработка extras ...
        return pOk(o, p)
    return parser
```

### Constraints (Ограничения)

```
Elo:    let PositiveInt = Int(i | i > 0) in 42 |> PositiveInt
```

**Компиляция:**
```python
(lambda _: (
    _p_PositiveInt := pSubtype(pInt, [
        ("constraint 'i > 0' failed", lambda i: i > 0)
    ]),
    PositiveInt := lambda v: pUnwrap(_p_PositiveInt(v, '')),
    PositiveInt(42)
)[-1])
```

### Опциональные поля

```
Elo:    let Config = { name: String, debug?: Bool } in data |> Config
```

Третий параметр в кортеже (`True`) указывает на опциональность:
```python
pSchema([
    ("name", pString, False),   # обязательное
    ("debug", pBool, True)      # опциональное
], "closed", None)
```

### Union-типы

```
Elo:    let StringOrInt = String | Int in value |> StringOrInt
```

```python
pUnion([pString, pInt])
```

### Массивы

```
Elo:    let Numbers = [Int] in data |> Numbers
```

```python
pArray(pInt)
```

---

## Prelude (Runtime-библиотека)

Prelude содержит все helper-функции, необходимые для выполнения скомпилированного кода.

**Получение prelude:**
```bash
./bin/eloc --prelude-only -t python
```

**Содержимое prelude:**
- `import math, functools, datetime as _dt, re`
- `class EloDuration` — класс для работы с длительностями
- Helper-функции (`kAssert`, `kEq`, `kFetch`, `kPatch`, etc.)
- Парсеры (`pOk`, `pFail`, `pString`, `pInt`, `pSchema`, etc.)
- Datetime helpers (`_elo_dt`, `_elo_start_of_day`, etc.)

---

## Выполнение Python-кода

### CLI

```bash
# Компиляция
./bin/eloc -e "2 + 3 * 4" -t python
# Вывод: (lambda _: 2 + 3 * 4)

# Компиляция с prelude
./bin/eloc -e "TODAY + P1D" -t python -p

# Только prelude
./bin/eloc --prelude-only -t python
```

### Выполнение

```bash
# Компиляция и выполнение
(./bin/eloc --prelude-only -t python; ./bin/eloc -e "2 ^ 10" -t python; echo "(None)") | python
# Вывод: 1024
```

---

## Особенности реализации

### 1. Walrus Operator (`:=`)

Требует **Python 3.8+**. Позволяет делать присваивания внутри выражений.

### 2. Все конструкции — выражения

Python имеет ограничения на statements внутри lambda. Решение:
- `let` → walrus + tuple + `[-1]`
- `guard` → `kAssert()` helper
- type definitions → combinator parsers

### 3. Safe Member Access

Вместо `_.field` (который вызовет `KeyError`) используется `_.get("field")`, возвращающий `None`.

### 4. Приоритеты операторов

Компилятор автоматически добавляет скобки где нужно:

```
Elo:    (2 + 3) * 4
Python: (2 + 3) * 4  # скобки сохранены

Elo:    2 + 3 * 4
Python: 2 + 3 * 4    # скобки не нужны
```

---

## Тестирование

### Unit-тесты

```bash
npm run test:unit
# Включает 30 тестов для Python compiler
```

### Acceptance-тесты (fixtures)

```bash
PYTHON_CMD=python bash test/acceptance/test-python.sh
```

44 fixture-файла проверяют семантическую эквивалентность Python-кода.

---

## Ограничения

1. **Python 3.8+** — требуется для walrus operator
2. **Single expression** — все конструкции должны быть выражениями
3. **No generators** — используем `list(map(...))` вместо list comprehensions для консистентности

---

## Примеры

### Вычисление налога
```
Elo:    let price = _.price, tax = 0.21 in price * (1 + tax)
Python: (lambda _: (price := _.get("price"), tax := 0.21, price * (1 + tax))[-1])
```

### Фильтрация и преобразование
```
Elo:    _.items |> filter(x ~> x.active) |> map(x ~> x.name)
Python: (lambda _: list(map(lambda x: x.get("name"),
         list(filter(lambda x: x.get("active"), _.get("items"))))))
```

### Валидация данных
```
Elo:    let User = {
          name: String,
          email: String(e | contains(e, '@')),
          age: Int(a | a >= 18)
        } in data |> User
```

### Работа с датами
```
Elo:    let due = _.dueDate |> Date in
        guard due > TODAY in
        due - TODAY |> inDays
```
