## Problem to solve

Klaro Cards currently uses `luxon` and not `dayjs` for time management.
I'm afraid of the refactoring necessary to move to dayjs, and don't want to
have both at the same time in Klaro's bundle.

## Idea

* What would be the cost of replacing dayjs by luxon here ?
* Is one of them known to be "better" in any way ?
