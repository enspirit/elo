(lambda _: kAssert(kPad("x", 5, "-", True) == "----x"))(None)
(lambda _: kAssert(kPad("x", 5, "-", False) == "x----"))(None)
(lambda _: kAssertFails(lambda : kPad("x", 10000001, "-", True)))(None)
(lambda _: kAssertFails(lambda : kPad("x", 10000001, "-", False)))(None)
