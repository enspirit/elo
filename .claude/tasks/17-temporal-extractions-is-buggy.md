## Problem to solve

I discovered that `minassert(minute(D2024-06-15T14:30:00Z) == 30)` does not work
on the website.

The expression is actually included in .klang acceptance testing fixtures, but
I see that the corresponding expected.{ruby,js,sql} files are not completed
(they have less lines), which explains why the acceptance test pass while they
should fail.

We must fix it.

## Idea

* First fix the acceptance test infrastructure with a test that checks the
  fixture files are complete.
* That new test should fail. Complete expected files to make it pass.
* Then run the tests and see why temporal-extraction tests fail.
