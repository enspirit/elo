## Problem to solve

Too often, Claude Code generates acceptance tests in .elo files that do not
contain an assert. This possibly does not test anything.

How to force Claude Code to meet the assert rule ?

## Idea

Add an integration test that checks that all .elo files have an `assert` call
on every line. Since Claude runs tests systematically, this one will fails and
guide it.
