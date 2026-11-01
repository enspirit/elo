(lambda _: kAssert(kEq(list(reversed([1, 2, 3])), [3, 2, 1])))(None)
(lambda _: kAssert(kEq(list(reversed([])), [])))(None)
(lambda _: kAssert(kEq(list(reversed(["a", "b", "c"])), ["c", "b", "a"])))(None)
(lambda _: kAssert(kEq(list(reversed([1])), [1])))(None)
