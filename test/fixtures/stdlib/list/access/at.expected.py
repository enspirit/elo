(lambda _: kAssert(kAt([1, 2, 3], 0) == 1))(None)
(lambda _: kAssert(kAt([1, 2, 3], 2) == 3))(None)
(lambda _: kAssert((kAt([1, 2, 3], 100) is None) == True))(None)
(lambda _: kAssert((kAt([1, 2, 3], -1) is None) == True))(None)
