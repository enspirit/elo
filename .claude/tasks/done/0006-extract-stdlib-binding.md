## Problem to solve

Currently the binding between the IR and stdlib is written in the three compilers
themselves (src/compilers/\*.ts).

Since we want to eventually have different compilation modes (such as using luxon
instead of dayjs, or making sure all calls to NOW/TODAY can be routed via a mock
function for testing purposes), it would be good to have stdlib bindings clearly
isolated.

## Idea

I propose to move the stdlib binding of each language it its own file.

**CRITICAL** this is a pure refactoring. Don't touch any test file, make sure
they all pass.
