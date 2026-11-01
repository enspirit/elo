(lambda _: kAssert(kEq(kFirst([1, 2, 3]), 1)))(None)
(lambda _: kAssert((kFirst([]) is None) == True))(None)
