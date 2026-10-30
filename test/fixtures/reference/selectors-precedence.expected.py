





(lambda _: kAssert(float(10 - 8) == 2))(None)
(lambda _: kAssert(float(10 - 8) / 4 == 0.5))(None)
(lambda _: kAssert(float(2 + 3) == 5))(None)
(lambda _: kAssert(float(2 * 3) == 6))(None)
(lambda _: kAssert(int(7.5 - 0.5) == 7))(None)
(lambda _: kAssert(int(3.2 + 3.3) == 6))(None)
(lambda _: kAssert(str(1 + 2) == "3"))(None)
(lambda _: kAssert(str(10 - 8) == "2"))(None)


(lambda _: kAssert(float(3) == 3))(None)
(lambda _: kAssert(int(3.7) == 3))(None)
(lambda _: kAssert(str(42) == "42"))(None)
(lambda _: kAssert(float("2.5") == 2.5))(None)
(lambda _: kAssert(int("42") == 42))(None)
