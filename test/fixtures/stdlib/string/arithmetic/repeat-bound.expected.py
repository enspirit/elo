(lambda _: kAssert(kStrMul("ab", 3) == "ababab"))(None)
(lambda _: kAssert(kStrMul("x", 0) == ""))(None)
(lambda _: kAssertFails(lambda : kStrMul("a", 10000001)))(None)
