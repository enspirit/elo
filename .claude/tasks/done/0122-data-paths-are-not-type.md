## Problem to solve

DataPath is presented as a Type in the reference. In fact it's not a propre
type but syntactig sugar over of list of string|int. Indeed the following
program returns `List`, not `DataPath`.

```elo
typeOf(.items.0)
```

## Idea

- That's actually fine, let's keep it that way.
- But let's correct the Reference page to clarify it.
- We keep DataPath everywhere in the stdlib though.
