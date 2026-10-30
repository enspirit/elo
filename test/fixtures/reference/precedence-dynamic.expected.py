






(lambda _: kAssert((f := lambda x, y: 12 * (x + y), f(1, 2))[-1] == 36))(None)
(lambda _: kAssert((f := lambda x, y: (x + y) * 12, f(1, 2))[-1] == 36))(None)
(lambda _: kAssert((f := lambda x, y: 12 - (x + y), f(1, 2))[-1] == 9))(None)
(lambda _: kAssert((f := lambda x, y: 12 / (x + y), f(1, 2))[-1] == 4))(None)
(lambda _: kAssert((f := lambda x, y: 12 % (x + y), f(5, 2))[-1] == 5))(None)
(lambda _: kAssert((f := lambda x, y: (x + y) ** 2, f(1, 2))[-1] == 9))(None)
(lambda _: kAssert((f := lambda x, y: -(x + y), f(40, 15))[-1] == -55))(None)
(lambda _: kAssert((f := lambda x, y: 2 * (x - y), f(5, 1))[-1] == 8))(None)
(lambda _: kAssert((f := lambda x, y: 100 / (x * y), f(2, 5))[-1] == 10))(None)
(lambda _: kAssert((f := lambda x, y, z: x * (y + z) - 1, f(2, 3, 4))[-1] == 13))(None)
(lambda _: kAssert((f := lambda x, y: (x + 1) * (y + 1), f(2, 3))[-1] == 12))(None)
(lambda _: kAssert((f := lambda x, y: 1 - (x - y), f(5, 2))[-1] == -2))(None)
(lambda _: kAssert((f := lambda x, y: 24 / (x / y), f(6, 2))[-1] == 8))(None)


(lambda _: kAssert(12 * (1 + 2) == 36))(None)
(lambda _: kAssert(12 - (1 + 2) == 9))(None)
(lambda _: kAssert(-(40 + 15) == -55))(None)
(lambda _: kAssert(24 / (6 / 2) == 8))(None)


(lambda _: kAssert((f := lambda x, y: x + y > 10, f(6, 5))[-1] == True))(None)
(lambda _: kAssert((f := lambda x, y: x > y == True, f(2, 1))[-1] == True))(None)
(lambda _: kAssert((f := lambda x, y: not (x > y), f(1, 2))[-1] == True))(None)
