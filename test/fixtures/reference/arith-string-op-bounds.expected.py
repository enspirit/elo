





(lambda _: kAssert(kEq((f := lambda x: kMul(x, 3), f("ab"))[-1], "ababab")))(None)
(lambda _: kAssert(kStrMul("ab", 3) == "ababab"))(None)
(lambda _: kAssert(kAssertFails(lambda : (f := lambda x: kMul(x, 6000000), f("ab"))[-1])))(None)
(lambda _: kAssert(kAssertFails(lambda : kStrMul("ab", 6000000))))(None)


(lambda _: kAssert(kEq((f := lambda x, y: kMod(x, y), f(7, 3))[-1], 1)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMod(x, y), f(-7, 3))[-1], 2)))(None)
(lambda _: kAssert(7 % 3 == 1))(None)
(lambda _: kAssert(kAssertFails(lambda : (f := lambda x: kMod(x, 1), f("%d"))[-1])))(None)


(lambda _: kAssert(kPow(2, 10) == 1024))(None)
(lambda _: kAssert(kAssertFails(lambda : kPow(2, 20000000))))(None)
