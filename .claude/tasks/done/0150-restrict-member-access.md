# Security: restrict member access and method calls to data types only

Prevent arbitrary property access and method calls on typed values (date,
datetime, duration, interval, string, int, bool, fn). This closes two
security/portability holes:

1. Property access like `datetime.year` or `interval.start` exposed runtime
   internals (Luxon methods) and only worked in JavaScript
2. Method calls like `datetime.diff(...)` allowed calling arbitrary runtime
   methods

Users should use stdlib functions instead (e.g., `year(date)`, `start(interval)`).

Member access on data types (any, object, array) is still allowed for
accessing user data properties.

## Done
- [x] Add validation in transform.ts for MemberAccess and MethodCall
- [x] Allow member access only on data types (any, object, array)
- [x] Add comprehensive unit tests for the restrictions
- [x] All tests pass
