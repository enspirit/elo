# Add reverse, trimStart, trimEnd, isBlank to String stdlib

Added 4 new String stdlib functions across all 4 targets (JS, Ruby, SQL, Python):

- **reverse** (Transform): Reverses a string
- **trimStart** (Transform): Removes leading whitespace
- **trimEnd** (Transform): Removes trailing whitespace
- **isBlank** (Predicates): True if empty or whitespace-only

## Done
- [x] Register in all 4 bindings (js, ruby, sql, python)
- [x] Add fixtures with assertions
- [x] Regenerate expected files
- [x] Update stdlib.astro with new entries in subsections
- [x] Update README with String functions list
- [x] All tests pass
