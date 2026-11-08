



(lambda _: kAssert(kEq((f := lambda s: int(s), f("42"))[-1], 42)))(None)
(lambda _: kAssert(kEq((f := lambda s: int(s), f("-42"))[-1], -42)))(None)
(lambda _: kAssert(kEq((f := lambda s: int(s), f("08"))[-1], 8)))(None)
(lambda _: kAssert(kEq((f := lambda s: int(s), f("010"))[-1], 10)))(None)
(lambda _: kAssert(kEq((f := lambda s: int(s), f("-08"))[-1], -8)))(None)
(lambda _: kAssert(kEq((f := lambda s: int(s), f(3.7))[-1], 3)))(None)
(lambda _: kAssert(kEq((f := lambda s: float(s), f("2.5"))[-1], 2.5)))(None)
(lambda _: kAssert(kEq((f := lambda s: float(s), f("08.5"))[-1], 8.5)))(None)
(lambda _: kAssert(kEq((f := lambda s: float(s), f(3))[-1], 3.0)))(None)
(lambda _: kAssert(kEq((f := lambda s: kToString(s), f(42))[-1], "42")))(None)
(lambda _: kAssert(kEq((f := lambda s: kBool(s), f("true"))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda s: kParseDate(s), f("2025-01-15"))[-1], _elo_dt(2025, 1, 15))))(None)
(lambda _: kAssert(kEq((f := lambda s: kParseDuration(s), f("P1D"))[-1], EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssertFails(lambda : (f := lambda s: int(s), f("abc"))[-1]))(None)
