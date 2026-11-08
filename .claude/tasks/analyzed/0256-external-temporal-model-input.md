# Temporal Model for an Analyst-Oriented Expression Language

> **External input, kept for provenance. This is not Elo's model.** An
> independent review of the date/time literature, with no sight of this
> repository, was asked what a temporal language should look like. It proposes
> ten types (`Instant`, `ZonedDateTime`, `Period` vs `Duration`, …) where Elo
> has two, so most of it is deliberately *not* taken: Elo's answer is that
> there are **no instants at all**, which is a smaller language than this one
> and the reason it stays portable across four targets.
>
> What was taken from it: the fold/gap attack on the wall-clock model (§8), the
> month-end non-invertibility (§9), the stable evaluation clock (§7.1), and
> precision as a language-level decision (§11). Those became `D3`, `D5` and
> the "not decided" list in **`todo/0259-the-temporal-model.md`**, which is the
> decision record.

**Design proposal — Version 0.1**

## 1. Purpose and design philosophy

The goal is to design a small, intuitive expression language for non-programmers and analysts, with first-class support for time management.

Temporal operations should be simple to express, predictable, and mathematically well-defined.

The guiding principle is:

> Make the easy things obvious, make the difficult things possible, and never make an ambiguous operation silently produce a misleading result.

The proposed philosophy is **progressive explicitness (hybrid)**:

- Common temporal expressions should be natural and effortless.
- The language should infer intent when doing so is safe.
- Important semantic distinctions must be preserved.
- Ambiguous operations should require clarification or follow a clearly documented policy.
- Advanced functionality should remain accessible without burdening ordinary users.

The semantic model should be rigorous and independent of surface syntax. This allows the language to offer friendly expressions without compromising correctness.

## 2. Fundamental distinction: Instant vs. wall-clock time

The distinction between timeline time and civil (wall-clock) time is the foundation of the proposed model.

### 2.1 Instant

An `Instant` represents a unique point on the global timeline.

Examples:

- When a transaction occurred.
- When a report was generated.
- When an event actually happened.
- When an operation started or finished.

An instant is independent of time zones and calendar presentation.

### 2.2 Wall-clock (civil) time

Civil time represents human-facing calendar and clock conventions.

Examples:

- November 8, 2026.
- 09:30.
- Monday at 14:00 in Brussels.

Civil time is interpreted using a calendar and, when relevant, a time zone.

A local date and time does not necessarily identify a unique instant. During daylight-saving transitions, it can correspond to two instants or no instant at all.

### 2.3 Core principle

An instant can be represented in multiple time zones without changing the instant itself.

Conversely, a local date/time requires additional information before it can reliably identify an instant.

An explicit UTC offset is sufficient to identify an instant when combined with a local date/time, but an offset is not equivalent to a time zone: it does not contain historical or future civil-time rules.

## 3. Proposed temporal type system

The initial model contains the following fundamental types.

| Type | Meaning | Example |
|---|---|---|
| `Instant` | A point on the global timeline | `2026-11-08T08:30:00Z` |
| `Date` | A calendar date | `2026-11-08` |
| `Time` | A time of day | `09:30` |
| `LocalDateTime` | Date and time without a time zone | `2026-11-08 09:30` |
| `ZonedDateTime` | Local date/time interpreted in a time zone | `2026-11-08 09:30 Europe/Brussels` |
| `Duration` | A fixed elapsed amount of time | `90 minutes` |
| `Period` | A calendar-relative amount of time | `1 month` |
| `TimeZone` | A set of civil-time rules | `Europe/Brussels` |

Two additional types are proposed:

- `Interval`: a range of instants.
- `Calendar`: a system of calendar rules.

A future extension could introduce `BusinessCalendar`, representing working days, holidays and organization-specific schedules.

## 4. Duration versus Period

This is one of the most important distinctions in the entire design.

### 4.1 Duration

A `Duration` represents a fixed elapsed amount of time, independent of calendars and time zones.

Examples:

- 30 seconds
- 90 minutes
- 24 hours

A duration of 24 hours always represents exactly 86,400 seconds.

### 4.2 Period

A `Period` represents a calendar-relative amount.

Examples:

- 1 calendar day
- 1 month
- 1 year
- 3 calendar weeks

Applying a period requires a calendar and, depending on the operation, may also require a time zone.

### 4.3 Why the distinction matters

Consider a daylight-saving transition.

The expressions:

- Add 24 hours.
- Add 1 calendar day.

are not necessarily equivalent.

Adding 24 hours advances an instant by exactly 86,400 seconds.

Adding one calendar day advances to the corresponding local calendar date, potentially preserving the local clock time. The elapsed duration can therefore be 23, 24 or 25 hours.

The language should make this distinction explicit.

Recommended expressions:

```text
now + 24 hours
now + 1 calendar day
today + 1 day
```

The meaning of `now + 1 day` should be defined by a deliberate language policy rather than left implicit.

## 5. Arithmetic and operator semantics

The following operator rules are proposed.

| Left operand | Operator | Right operand | Result |
|---|---|---|---|
| Instant | `+` | Duration | Instant |
| Instant | `-` | Duration | Instant |
| Instant | `-` | Instant | Duration |
| Date | `+` | Period | Date |
| Date | `-` | Period | Date |
| Date | `-` | Date | Calendar-day difference |
| Time | `+` | Duration | Time, with defined day-wrap semantics |
| LocalDateTime | `+` | Period | LocalDateTime |
| ZonedDateTime | `+` | Duration | ZonedDateTime |
| ZonedDateTime | `+` | Period | ZonedDateTime, subject to zone rules |

Subtracting two dates should produce a calendar-day difference, not an elapsed duration.

For example:

```text
2026-03-29 - 2026-03-28
```

equals one calendar day, regardless of whether the corresponding civil day contains 23, 24 or 25 elapsed hours.

Subtracting two local date/times should not automatically produce an elapsed duration, because they do not necessarily identify instants.

## 6. Intervals

Introduce a first-class `Interval` type representing a range of instants.

Use half-open intervals:

```text
[start, end)
```

The start is inclusive; the end is exclusive.

For example:

```text
[Monday, Tuesday)
[Tuesday, Wednesday)
```

These intervals are adjacent, without overlap or gaps.

This convention is particularly useful for analytical queries, reporting periods, filtering and time-series processing.

Example:

```text
sales where timestamp >= start
      and timestamp < end
```

Avoid end-of-day representations such as `23:59:59.999999`, which are precision-dependent and error-prone.

## 7. Evaluation context

The language should provide an implicit temporal evaluation context.

It should contain at least:

| Property | Purpose |
|---|---|
| `now` | Captured evaluation instant |
| `time_zone` | Default civil time zone |
| `calendar` | Default calendar system |
| `locale` | Formatting conventions |

### 7.1 Stable evaluation clock

`now` should be captured once per expression evaluation.

All references to `now` within the same evaluation should return the same instant.

For example:

```text
if now < deadline then "Pending"
else "Expired"
```

Both references to `now` must use the same captured value.

This provides predictable semantics and makes expressions reproducible when the evaluation clock is supplied explicitly.

### 7.2 Context-sensitive convenience expressions

The following expressions are proposed:

```text
now
today
yesterday
tomorrow
this_month
```

Their semantics:

- `now` returns an `Instant`.
- `today` returns a `Date` in the evaluation context's default time zone.
- `yesterday` returns the preceding calendar date.
- `tomorrow` returns the following calendar date.
- `this_month` refers to the current calendar month.

Users should be able to override the default time zone:

```text
today in "Europe/Paris"
```

or:

```text
today(time_zone: "Europe/Paris")
```

The exact syntax remains open.

## 8. Daylight-saving transitions and ambiguity

The model must explicitly address daylight-saving transitions.

A local date/time can be:

1. Valid and unambiguous.
2. Ambiguous: it occurs twice.
3. Nonexistent: it does not occur.

For example, during the autumn transition in Brussels, `02:30` can occur twice.

During the spring transition, certain local times do not occur at all.

### Proposed rules

- An `Instant` is always unambiguous.
- A `LocalDateTime` may be ambiguous or nonexistent when interpreted in a particular time zone.
- Converting a `LocalDateTime` into a `ZonedDateTime` must resolve any ambiguity.
- Common operations should have sensible, documented defaults.
- Explicit conversion should allow the user to override those defaults.

Possible resolution policies:

| Policy | Meaning |
|---|---|
| `earlier` | Choose the earlier instant when a time occurs twice |
| `later` | Choose the later instant |
| `shift_forward` | Move a nonexistent time forward by the transition gap |
| `reject` | Refuse ambiguous or nonexistent conversions |

A reasonable initial policy is to use `reject` for explicit user-entered local date/time conversions, while defining appropriate defaults for calendar arithmetic.

## 9. Month-end arithmetic

Calendar arithmetic needs a clearly defined month-end policy.

Consider:

```text
January 31 + 1 month
```

Possible policies:

- Clamp to the last valid day of the target month.
- Overflow into the following month.
- Reject the operation.

**Recommended default: clamp.**

Examples:

```text
January 31 + 1 month = February 28
January 31 + 2 months = March 31
```

For leap years, February 29 should be used when applicable.

An important consequence is that calendar arithmetic is not necessarily associative:

```text
January 31 + 1 month + 1 month
```

may produce March 28, whereas:

```text
January 31 + 2 months
```

produces March 31.

This is acceptable as long as the semantics are explicit.

## 10. Three meanings of a day

The language should distinguish three concepts:

- **Calendar day:** a date in a calendar.
- **Elapsed day:** exactly 24 hours.
- **Business day:** a working day according to a business calendar.

These should never be silently treated as equivalent.

Business-day operations should eventually support:

- Weekends.
- Public holidays.
- Organization-specific holidays.
- Working-day conventions.
- Optional working hours.

This functionality can be introduced as an extension rather than part of the initial core.

## 11. Precision and time scale

The implementation must define:

- The underlying time scale.
- The representation of instants.
- Supported precision.
- Leap-second handling.
- Calendar system.
- Time-zone database and versioning policy.

Initial recommendations:

- Use a well-defined UTC-based time representation.
- Support microsecond or nanosecond precision, according to implementation requirements.
- Document leap-second handling explicitly.
- Avoid dependence on the host machine's local time zone.
- Use the proleptic Gregorian calendar initially.
- Use an established time-zone database for civil-time conversions.

The implementation details should remain invisible to ordinary users, but they must be part of the language specification.

## 12. Surface syntax

The language should expose simple expressions for common operations.

Examples:

```text
now
today
tomorrow
yesterday
this month

now + 2 hours
now + 24 hours
today + 1 day
today at 09:30

between(start, end)
elapsed_since(created_at)
```

More explicit operations should be available when necessary:

```text
today in "Europe/Brussels"
now + 1 calendar day
```

The exact syntax and naming conventions remain to be designed.

The important constraint is that syntax should reflect the semantic model rather than weaken it.

## 13. Core design principles

The following principles should guide all future decisions.

1. **Never silently discard temporal information.** Conversions requiring a time zone or calendar must have a defined context.

2. **Separate timeline arithmetic from calendar arithmetic.** Duration and Period are fundamentally different concepts.

3. **Make ambiguity explicit.** Define behavior for daylight-saving transitions and invalid dates.

4. **Use a stable evaluation clock.** Every reference to `now` within an evaluation must be consistent.

5. **Keep the common case simple.** Users should not need to understand time zones, UTC offsets or daylight-saving rules to write `tomorrow`.

6. **Preserve semantic correctness.** Convenience must never result in silently misleading calculations.

7. **Keep the semantic model independent of syntax.** Multiple surface expressions may represent the same underlying operation.

## 14. Proposed initial scope

The recommended first version should include:

### Fundamental types

- Instant
- Date
- Time
- LocalDateTime
- ZonedDateTime
- Duration
- Period
- TimeZone
- Interval
- Calendar

### Fundamental operations

- Current instant (`now`).
- Current date (`today`).
- Date arithmetic.
- Duration arithmetic.
- Instant comparison and subtraction.
- Time-zone conversion.
- Local date/time resolution.
- Interval construction and comparison.
- Calendar-period boundaries.

### Future extensions

- Business calendars.
- Business-day arithmetic.
- Recurring schedules.
- Working hours.
- Holiday calendars.
- Fiscal calendars.
- Reporting periods.
- More advanced recurrence and scheduling operations.

## 15. Outstanding design decisions

The following choices need to be finalized before the semantic specification is frozen.

| Question | Proposed direction |
|---|---|
| Meaning of `now + 1 day` | Prefer explicit distinction between elapsed and calendar days |
| Default time zone | Configured user or workspace time zone |
| Month-end arithmetic | Clamp |
| Ambiguous local date/time | Explicit resolution policy |
| Evaluation of `now` | One captured instant per evaluation |
| Interval boundaries | Inclusive start, exclusive end |
| Calendar system | Proleptic Gregorian initially |
| Initial scope | Analyst-oriented core, with extensibility |

## 16. Conclusion

The proposed model is built around a small number of strong semantic distinctions:

- Instant versus civil time.
- Duration versus Period.
- Date versus LocalDateTime.
- LocalDateTime versus ZonedDateTime.
- Calendar day versus elapsed day.
- Interval boundaries versus end-of-day timestamps.

These distinctions provide the foundation for a temporal language that is simultaneously intuitive and rigorous.

The central architectural recommendation is:

**Use a strict semantic type system underneath a friendly, progressively explicit expression language.**

The user should be able to express ordinary temporal intentions naturally, while the language ensures that the resulting calculations are correct, reproducible and unambiguous.

The objective is not to expose every complexity of temporal computing. It is to absorb that complexity into a carefully designed model so that users can trust the results without having to understand the machinery.
