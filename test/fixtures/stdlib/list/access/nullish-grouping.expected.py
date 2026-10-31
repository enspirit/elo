







(lambda _: kAssert(len(kFirst([[1, 2], [3]])) == 2))(None)
(lambda _: kAssert(len(kAt([[1, 2], [3]], 0)) == 2))(None)
(lambda _: kAssert(len(kAt([[1, 2], [3]], 1)) == 1))(None)
(lambda _: kAssert(len(kFirst(["ab", "c"])) == 2))(None)
(lambda _: kAssert(len(kAt(["ab", "c"], 1)) == 1))(None)
(lambda _: kAssert(len(kLast([[1], [2, 3]])) == 2))(None)
(lambda _: kAssert(sum(kFirst([[1, 2], [3]])) == 3))(None)
(lambda _: kAssert(kFirst(kFirst([[7, 8]])) == 7))(None)
(lambda _: kAssert(kFirst(["ab"]).upper() == "AB"))(None)


(lambda _: kAssert((kFirst([]) is None)))(None)
(lambda _: kAssert((kAt([], 0) is None)))(None)
(lambda _: kAssert((kAt([1, 2], 9) is None)))(None)
(lambda _: kAssert(kFirst([5]) == 5))(None)
(lambda _: kAssert(kAt([5, 6], 1) == 6))(None)
