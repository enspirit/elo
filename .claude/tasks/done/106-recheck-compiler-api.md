## Problem to solve

Since task 84 (commit 8438bca028b725c5361b3fba361a73631a4f52a1) I disagree
with our `compile` API function.

Examples like this one is wrong and misleading. Since every Elo program returns
a function that takes `_` as input, `double` should be a function that returns
a function, and not 42 at all.

```typescript
import { compile } from '@enspirit/elo';
import { DateTime, Duration } from 'luxon';

const double = compile<(x: number) => number>(
  'fn(x ~> x * 2)',
  { runtime: { DateTime, Duration } }
);
double(21); // => 42
```

Said otherwise, I don't want `compile` to execute the function resulting from
Elo's compilation on `null`, but to return that function instead.

## Idea

Fix it and simplify examples in compile.ts and in README.
