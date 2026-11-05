






(lambda _: kAssert(kEq((f := lambda x, y: kMul(12, kAdd(x, y)), f(1, 2))[-1], 36)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMul(kAdd(x, y), 12), f(1, 2))[-1], 36)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kSub(12, kAdd(x, y)), f(1, 2))[-1], 9)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kDiv(12, kAdd(x, y)), f(1, 2))[-1], 4)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMod(12, kAdd(x, y)), f(5, 2))[-1], 5)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kPow(kAdd(x, y), 2), f(1, 2))[-1], 9)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kNeg(kAdd(x, y)), f(40, 15))[-1], -55)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMul(2, kSub(x, y)), f(5, 1))[-1], 8)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kDiv(100, kMul(x, y)), f(2, 5))[-1], 10)))(None)
(lambda _: kAssert(kEq((f := lambda x, y, z: kSub(kMul(x, kAdd(y, z)), 1), f(2, 3, 4))[-1], 13)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMul(kAdd(x, 1), kAdd(y, 1)), f(2, 3))[-1], 12)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kSub(1, kSub(x, y)), f(5, 2))[-1], -2)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kDiv(24, kDiv(x, y)), f(6, 2))[-1], 8)))(None)


(lambda _: kAssert(12 * (1 + 2) == 36))(None)
(lambda _: kAssert(12 - (1 + 2) == 9))(None)
(lambda _: kAssert(-(40 + 15) == -55))(None)
(lambda _: kAssert(24 / (6 / 2) == 8))(None)


(lambda _: kAssert(kEq((f := lambda x, y: (kAdd(x, y) > 10), f(6, 5))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: ((x > y)) == True, f(2, 1))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: not ((x > y)), f(1, 2))[-1], True)))(None)


(lambda _: kAssert(kEq((f := lambda x: kAdd(x, ((10) if (True) else (20))), f(1))[-1], 11)))(None)
(lambda _: kAssert(kEq((f := lambda x: kAdd(x, ((10) if (False) else (20))), f(1))[-1], 21)))(None)
(lambda _: kAssert(kEq((f := lambda x: kAdd(((10) if (False) else (20)), x), f(1))[-1], 21)))(None)
(lambda _: kAssert(kEq((f := lambda x: kMul(x, ((3) if (False) else (4))), f(2))[-1], 8)))(None)
(lambda _: kAssert(kEq((f := lambda x: kNeg(((x) if (False) else (kAdd(x, 1)))), f(3))[-1], -4)))(None)
