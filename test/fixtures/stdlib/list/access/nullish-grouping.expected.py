







(lambda _: kAssert(kEq(len(kFirst([[1, 2], [3]])), 2)))(None)
(lambda _: kAssert(kEq(len(kAt([[1, 2], [3]], 0)), 2)))(None)
(lambda _: kAssert(kEq(len(kAt([[1, 2], [3]], 1)), 1)))(None)
(lambda _: kAssert(kEq(len(kFirst(["ab", "c"])), 2)))(None)
(lambda _: kAssert(kEq(len(kAt(["ab", "c"], 1)), 1)))(None)
(lambda _: kAssert(kEq(len(kLast([[1], [2, 3]])), 2)))(None)
(lambda _: kAssert(kEq(sum(kFirst([[1, 2], [3]])), 3)))(None)
(lambda _: kAssert(kEq(kFirst(kFirst([[7, 8]])), 7)))(None)
(lambda _: kAssert(kEq(kFirst(["ab"]).upper(), "AB")))(None)


(lambda _: kAssert((kFirst([]) is None)))(None)
(lambda _: kAssert((kAt([], 0) is None)))(None)
(lambda _: kAssert((kAt([1, 2], 9) is None)))(None)
(lambda _: kAssert(kEq(kFirst([5]), 5)))(None)
(lambda _: kAssert(kEq(kAt([5, 6], 1), 6)))(None)
