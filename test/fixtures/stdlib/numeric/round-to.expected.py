





(lambda _: kAssert(kRoundTo(3.14159, 2) == 3.14))(None)
(lambda _: kAssert(kRoundTo(3.14159, 4) == 3.1416))(None)
(lambda _: kAssert(kRoundTo(2.5, 0) == 3))(None)
(lambda _: kAssert(kRoundTo(0.797381, 4) == 0.7974))(None)
(lambda _: kAssert(kRoundTo(271.6954, 2) == 271.7))(None)
(lambda _: kAssert(kRoundTo(103.125, 2) == 103.13))(None)
(lambda _: kAssert(kRoundTo(2.675, 2) == 2.68))(None)
(lambda _: kAssert(kRoundTo(1.0 / 3, 3) == 0.333))(None)
(lambda _: kAssert(kRoundTo(123.456, 1) == 123.5))(None)
(lambda _: kAssert(kRoundTo(123.456, 0) == 123))(None)


(lambda _: kAssert(kRoundTo(-3.14159, 2) == -3.14))(None)
(lambda _: kAssert(kRoundTo(-2.5, 0) == -3))(None)
(lambda _: kAssert(kRoundTo(-0.125, 2) == -0.13))(None)


(lambda _: kAssert(kRoundTo(42, 2) == 42))(None)
(lambda _: kAssert(kRoundTo(7, 0) == 7))(None)
