## Problem to solve

Claude Code often regenerates expected fixture files (test/fixtures/**/*.expected.*)
using `bin/kc`. He keep asking for permissions all the time to do that, which is
a bit annoying.

In addition, it seems that regenerating expected files is a key feature of a compiler
like ours. So it would be legit to have specific scripts for that task.

## Idea

- How about having a Makefile allowing to regenerate expected files ?
- Or, possibly better, a script or npm target that takes options and possibly
  the .klang file(s) to regenerate ?
