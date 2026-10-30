(lambda _: kAssert(kRound(3.2) == 3))(None)
(lambda _: kAssert(kRound(3.5) == 4))(None)
(lambda _: kAssert(kRound(3.7) == 4))(None)
(lambda _: kAssert(kRound(-3.2) == -3))(None)
(lambda _: kAssert(kRound(-3.7) == -4))(None)
(lambda _: kAssert(kRound(5.0) == 5))(None)




(lambda _: kAssert(kRound(2.5) == 3))(None)
(lambda _: kAssert(kRound(-2.5) == -3))(None)
(lambda _: kAssert(kRound(-3.5) == -4))(None)
(lambda _: kAssert(kRound(0.5) == 1))(None)
(lambda _: kAssert(kRound(-0.5) == -1))(None)
(lambda _: kAssert(kRound(1.5) == 2))(None)
(lambda _: kAssert(kRound(-1.5) == -2))(None)




(lambda _: kAssert(kRound(5 ** 1 / 2) == 3))(None)
(lambda _: kAssert(kRound(-5 ** 1 / 2) == -3))(None)
(lambda _: kAssert(kRound(7 ** 1 / 2) == 4))(None)
