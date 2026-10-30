





(lambda _: kAssert(7 / 2 == 3.5))(None)
(lambda _: kAssert(1 / 4 == 0.25))(None)
(lambda _: kAssert(10 / 4 == 2.5))(None)
(lambda _: kAssert(1 / 3 > 0.33))(None)
(lambda _: kAssert(3 / 2 * 2 == 3))(None)
(lambda _: kAssert(100 / 8 == 12.5))(None)
(lambda _: kAssert(-7 / 2 == -3.5))(None)
(lambda _: kAssert(0 / 5 == 0))(None)


(lambda _: kAssert(7.0 / 2 == 3.5))(None)
(lambda _: kAssert(7 / 2.0 == 3.5))(None)
(lambda _: kAssert(7.5 / 2.5 == 3))(None)


(lambda _: kAssert((f := lambda a, b: a / b, f(7, 2))[-1] == 3.5))(None)
(lambda _: kAssert((f := lambda a, b: a / b, f(1, 4))[-1] == 0.25))(None)
(lambda _: kAssert((f := lambda a, b: a / b, f(7.5, 2.5))[-1] == 3))(None)
(lambda _: kAssert((n := 2, 7 / n)[-1] == 3.5))(None)
(lambda _: kAssert((a := 10, b := 4, a / b)[-1] == 2.5))(None)


(lambda _: kAssert((1 + 1) / 4 == 0.5))(None)
(lambda _: kAssert(24 / (6 / 2) == 8))(None)
(lambda _: kAssert(round(7 / 2) == 4))(None)
