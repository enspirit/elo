













(lambda _: kAssert(kEq((f := lambda x: kAdd(x, EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P1D")))[-1], EloDuration.from_iso("P2D"))))(None)
(lambda _: kAssert(kEq((f := lambda x: kSub(x, EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P2D")))[-1], EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kAdd(x, y), f(EloDuration.from_iso("P1D"), EloDuration.from_iso("P1D")))[-1], EloDuration.from_iso("P2D"))))(None)
(lambda _: kAssert(kEq((f := lambda x: kMul(x, 2), f(EloDuration.from_iso("P1D")))[-1], EloDuration.from_iso("P2D"))))(None)
(lambda _: kAssert(kEq((f := lambda x: kDiv(x, 2), f(EloDuration.from_iso("P2D")))[-1], EloDuration.from_iso("P1D"))))(None)


(lambda _: kAssert(kEq((f := lambda x: kEq(x, EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P1D")))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x: kEq(x, EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P2D")))[-1], False)))(None)
(lambda _: kAssert(kEq((f := lambda x: not kEq(x, EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P2D")))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kEq(x, y), f(EloDuration.from_iso("P1D"), EloDuration.from_iso("P1D")))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kEq(x, y), f(EloDuration.from_iso("PT24H"), EloDuration.from_iso("P1D")))[-1], True)))(None)


(lambda _: kAssert(kEq((f := lambda x: (x < EloDuration.from_iso("P2D")), f(EloDuration.from_iso("P1D")))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x: (x >= EloDuration.from_iso("P1D")), f(EloDuration.from_iso("P2D")))[-1], True)))(None)


(lambda _: kAssert(kEq((f := lambda x: kAdd(x, EloDuration.from_iso("P1D")), f(_elo_dt(2024, 1, 15, 0, 0, 0)))[-1], _elo_dt(2024, 1, 16, 0, 0, 0))))(None)
(lambda _: kAssert(kEq((f := lambda x: kSub(x, EloDuration.from_iso("P1D")), f(_elo_dt(2024, 1, 16, 0, 0, 0)))[-1], _elo_dt(2024, 1, 15, 0, 0, 0))))(None)
(lambda _: kAssert(kEq((f := lambda x: kEq(x, _elo_dt(2024, 1, 15, 0, 0, 0)), f(_elo_dt(2024, 1, 15, 0, 0, 0)))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kSub(x, y), f(_elo_dt(2024, 1, 16, 0, 0, 0), _elo_dt(2024, 1, 15, 0, 0, 0)))[-1], EloDuration.from_iso("P1D"))))(None)


(lambda _: kAssert(kEq((f := lambda x, y: kAdd(x, y), f(_elo_dt(2026, 3, 1), EloDuration.from_iso("P1M")))[-1], _elo_dt(2026, 4, 1))))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kSub(x, y), f(_elo_dt(2026, 4, 1), EloDuration.from_iso("P1M")))[-1], _elo_dt(2026, 3, 1))))(None)


(lambda _: kAssert((kAdd(EloDuration.from_iso("P1D"), EloDuration.from_iso("P1D")) == EloDuration.from_iso("P2D"))))(None)
(lambda _: kAssert((EloDuration.from_iso("P1D") == EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert((EloDuration.from_iso("PT24H") == EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2024, 1, 15, 0, 0, 0), EloDuration.from_iso("P1D")), _elo_dt(2024, 1, 16, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P1M")), _elo_dt(2026, 4, 1))))(None)
