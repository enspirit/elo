(lambda _: kAssert(kEq(kLast([1, 2, 3]), 3)))(None)
(lambda _: kAssert((kLast([]) is None) == True))(None)
