






(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(7, 2))[-1], 3.5)))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(1, 4))[-1], 0.25)))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(7.5, 2.5))[-1], 3)))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(10, 4))[-1], 2.5)))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(-7, 2))[-1], -3.5)))(None)


(lambda _: kAssert(7 / 2 == 3.5))(None)
(lambda _: kAssert(1 / 4 == 0.25))(None)
(lambda _: kAssert(7.5 / 2.5 == 3))(None)
