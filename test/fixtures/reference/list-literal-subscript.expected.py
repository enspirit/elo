










(lambda _: kAssert(kEq(kFirst([1, 2, 3]), 1)))(None)
(lambda _: kAssert(kEq(kLast([1, 2, 3]), 3)))(None)
(lambda _: kAssert(kEq(kAt([1, 2, 3], 0), 1)))(None)
(lambda _: kAssert(kEq(kAt([1, 2, 3], 1), 2)))(None)
(lambda _: kAssert(kEq(kAt([1, 2, 3], 2), 3)))(None)

(lambda _: kAssert(kEq(kFirst([1.5, 2.5]), 1.5)))(None)
(lambda _: kAssert(kEq(kLast([1.5, 2.5]), 2.5)))(None)
(lambda _: kAssert(kEq(kFirst(["a", "b"]), "a")))(None)
(lambda _: kAssert(kEq(kAt(["a", "b"], 1), "b")))(None)
(lambda _: kAssert(kEq(kLast(["a", "b"]), "b")))(None)


(lambda _: kAssert(kEq(kFirst(list(reversed([1, 2, 3]))), 3)))(None)
(lambda _: kAssert(kEq(kLast(list(reversed([1, 2, 3]))), 1)))(None)
(lambda _: kAssert(kEq(kAt(sorted([3, 1, 2]), 0), 1)))(None)
(lambda _: kAssert(kEq(kAt(sorted([3, 1, 2]), 2), 3)))(None)


(lambda _: kAssert((kAt([1, 2, 3], 100) is None) == True))(None)
(lambda _: kAssert((kAt([1, 2, 3], -1) is None) == True))(None)
