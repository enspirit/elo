









(lambda _: kAssert(7.0 / 2 == 3.5))(None)
(lambda _: kAssert(1.0 / 4 == 0.25))(None)
(lambda _: kAssert(10.0 / 4 == 2.5))(None)
(lambda _: kAssert(3.0 / 2 * 2 == 3))(None)
(lambda _: kAssert(5.0 / 2 == 2.5))(None)
(lambda _: kAssert(1.0 / 3 > 0.33))(None)
(lambda _: kAssert((n := 2, 5.0 / n)[-1] == 2.5))(None)
(lambda _: kAssert((f := lambda x: 9.0 / x, f(2))[-1] == 4.5))(None)


(lambda _: kAssert(1.0 == 1))(None)
(lambda _: kAssert(2.0 + 1 == 3))(None)
(lambda _: kAssert(-0.0 == 0))(None)
(lambda _: kAssert(42.0 == 42))(None)


(lambda _: kAssert(kRound(2.0) == 2))(None)
(lambda _: kAssert(abs(-3.0) == 3))(None)
(lambda _: kAssert((lambda a: min(a) if a else None)([2.0, 1]) == 1))(None)
