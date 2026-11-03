














(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1M"), 2)), _elo_dt(2026, 5, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(2, EloDuration.from_iso("P1M"))), _elo_dt(2026, 5, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1M"), 3)), _elo_dt(2026, 6, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(-1, EloDuration.from_iso("P1M"))), _elo_dt(2026, 2, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1M"), 1)), _elo_dt(2026, 4, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1M"), 0)), _elo_dt(2026, 3, 1))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 1, 31), kMul(EloDuration.from_iso("P1M"), 1)), _elo_dt(2026, 2, 28))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 12, 31), kMul(EloDuration.from_iso("P1M"), 2)), _elo_dt(2027, 2, 28))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1Y"), 2)), _elo_dt(2028, 3, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1M1D"), 2)), _elo_dt(2026, 5, 3))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kMul(EloDuration.from_iso("P1Y1M"), 2)), _elo_dt(2028, 5, 1))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 1, 31), kSub(EloDuration.from_iso("P1M"), EloDuration.from_iso("P10D"))), _elo_dt(2026, 2, 18))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kSub(EloDuration.from_iso("P2M"), EloDuration.from_iso("P1M"))), _elo_dt(2026, 4, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kSub(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1M"))), _elo_dt(2026, 3, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kSub(EloDuration.from_iso("P1M1D"), EloDuration.from_iso("P1D"))), _elo_dt(2026, 4, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kSub(EloDuration.from_iso("P1Y"), EloDuration.from_iso("P1M"))), _elo_dt(2027, 2, 1))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kAdd(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1M"))), _elo_dt(2026, 5, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kAdd(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1D"))), _elo_dt(2026, 4, 2))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 5, 31, 8, 0, 0), kMul(EloDuration.from_iso("P1M"), 2)), _elo_dt(2026, 7, 31, 8, 0, 0))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 5, 15, 8, 0, 0), kSub(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1D"))), _elo_dt(2026, 6, 14, 8, 0, 0))))(None)
