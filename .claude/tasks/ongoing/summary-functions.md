# Summary functions

In addition to min and max, we'd like other summary functions on List.

## Idea

Let's add support for:

```
count(List)
sum(List, neutral = 0)
avg(List)
lastBy(List, fn)
lastBy(List, DataPath)
firstBy(List, fn)
firstBy(List, DataPath)
```

## Method

* One summary function at a time
* Write acceptance tests in a separate folder: fixtures/stdlib/list/summary/{summary}.elo
* We could have summary functions in a subsection of the List stdlib web page

## Progress

- [x] count(List) — added as alias for length
- [x] Summary Functions subsection on stdlib page (with count, min, max)
- [x] sum(List) — returns sum of elements, 0 for empty list
- [ ] avg(List)
- [ ] firstBy(List, fn) / firstBy(List, DataPath)
- [ ] lastBy(List, fn) / lastBy(List, DataPath)
