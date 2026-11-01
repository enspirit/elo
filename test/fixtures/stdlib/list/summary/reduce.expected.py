(lambda _: kAssert(kEq(functools.reduce(lambda acc, x: kAdd(acc, x), [1, 2, 3], 0), 6)))(None)
(lambda _: kAssert(kEq(functools.reduce(lambda acc, x: kAdd(acc, x), ["a", "b", "c"], ""), "abc")))(None)
