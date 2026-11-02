# Failure structure, per target

A failure is a message *and* a kind: `kind`, `path` and `label` are what a host
branches on, so that "the data never arrived" is not the same event as "the data
arrived and was refused". See `test/unit/failure.unit.test.ts`, which pins that
for JavaScript through the `compile()` API.

Nothing pinned it for the *other* targets, and they had drifted: the structure
was added to the JavaScript runtime and re-implemented, incompletely, nowhere
else. A fixture assertion cannot catch that — Elo has no way to observe a
failure's kind from Elo source, `assertFails` only sees that something threw.

So each case here is a self-contained Elo expression that fails, next to the
structure every target must report for it.

    <name>.elo       one expression, needing no input, that fails
    <name>.expected  kind|path|label, with an empty field written as nothing

Run by `test/acceptance/test-failures.sh`, which compiles each case for each
target and wraps it in a driver that catches the failure and prints those three
fields.
