











(lambda _: kAssert(7 % 3 == 1))(None)
(lambda _: kAssert(9 % 3 == 0))(None)
(lambda _: kAssert(0 % 5 == 0))(None)
(lambda _: kAssert(1 % 5 == 1))(None)


(lambda _: kAssert(-7 % 3 == 2))(None)
(lambda _: kAssert(-1 % 3 == 2))(None)
(lambda _: kAssert(-3 % 3 == 0))(None)
(lambda _: kAssert(-9 % 5 == 1))(None)


(lambda _: kAssert(7 % -3 == -2))(None)
(lambda _: kAssert(1 % -3 == -2))(None)
(lambda _: kAssert(-7 % -3 == -1))(None)
(lambda _: kAssert(-9 % -5 == -4))(None)


(lambda _: kAssert(7.5 % 2 == 1.5))(None)
(lambda _: kAssert(-7.5 % 2 == 0.5))(None)
(lambda _: kAssert(7.5 % -2 == -0.5))(None)


(lambda _: kAssert(-1 % 7 == 6))(None)
(lambda _: kAssert(-8 % 7 == 6))(None)
(lambda _: kAssert((0 - 15) % 7 == 6))(None)


(lambda _: kAssert(7 % 3 + 10 == 11))(None)
(lambda _: kAssert(-7 % 3 * 2 == 4))(None)
(lambda _: kAssert((n := -7, n % 3)[-1] == 2))(None)
