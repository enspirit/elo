











(lambda _: kAssert(kTypeOf([1, "two", True, None]) == "List"))(None)
(lambda _: kAssert(len([1, "two", True, None]) == 4))(None)
(lambda _: kAssert(kEq(kAt([1, "two"], 0), 1)))(None)
(lambda _: kAssert(kEq(kAt([1, "two"], 1), "two")))(None)
(lambda _: kAssert(kEq([1, "two"], [1, "two"])))(None)
(lambda _: kAssert(("two" in [1, "two"]) == True))(None)


(lambda _: kAssert(kEq([[1], [2, 3]], [[1], [2, 3]])))(None)
(lambda _: kAssert(len([[1], [2, 3]]) == 2))(None)
(lambda _: kAssert(kEq(kAt([[1], [2, 3]], 1), [2, 3])))(None)
(lambda _: kAssert(kEq([[], [1, 2]], [[], [1, 2]])))(None)


(lambda _: kAssert(kEq([1, 1.5], [1, 1.5])))(None)
(lambda _: kAssert(kEq([[1, 2], [3, 4]], [[1, 2], [3, 4]])))(None)
(lambda _: kAssert(kEq([1, None, 3], [1, None, 3])))(None)
