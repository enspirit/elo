











(lambda _: kAssert(kEq(kFirst(["abc"])[::-1], "cba")))(None)
(lambda _: kAssert(kEq(kFirst([[1, 2, 3]])[::-1], [3, 2, 1])))(None)
(lambda _: kAssert(kEq(kFirst([""])[::-1], "")))(None)
(lambda _: kAssert(kEq(kFirst([[]])[::-1], [])))(None)


(lambda _: kAssert("abc"[::-1] == "cba"))(None)
(lambda _: kAssert(kEq(list(reversed([1, 2, 3])), [3, 2, 1])))(None)
