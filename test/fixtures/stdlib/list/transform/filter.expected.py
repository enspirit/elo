(lambda _: kAssert(kEq(list(filter(lambda x: x > 2, [1, 2, 3, 4])), [3, 4])))(None)
(lambda _: kAssert(kEq(list(filter(lambda x: x > 0, [])), [])))(None)
