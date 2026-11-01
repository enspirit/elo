(lambda _: kAssert(kEq(list(map(lambda x: kMul(x, 2), [1, 2, 3])), [2, 4, 6])))(None)
(lambda _: kAssert(kEq(list(map(lambda x: kMul(x, 2), [])), [])))(None)
(lambda _: kAssert(kEq((x := 10, list(map(lambda y: kAdd(x, y), [1, 2, 3])))[-1], [11, 12, 13])))(None)
