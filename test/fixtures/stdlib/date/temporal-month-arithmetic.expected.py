











(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P1M")), _elo_dt(2026, 4, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P2M")), _elo_dt(2026, 5, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P3M")), _elo_dt(2026, 6, 1))))(None)
(lambda _: kAssert(kEq(kSub(_elo_dt(2026, 4, 1), EloDuration.from_iso("P1M")), _elo_dt(2026, 3, 1))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 1, 31), EloDuration.from_iso("P1M")), _elo_dt(2026, 2, 28))))(None)
(lambda _: kAssert(kEq(kSub(_elo_dt(2026, 3, 31), EloDuration.from_iso("P1M")), _elo_dt(2026, 2, 28))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 5, 31), EloDuration.from_iso("P1M")), _elo_dt(2026, 6, 30))))(None)
(lambda _: kAssert(kEq(kAdd(kAdd(_elo_dt(2026, 1, 31), EloDuration.from_iso("P1M")), EloDuration.from_iso("P1M")), _elo_dt(2026, 3, 28))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 1, 31), EloDuration.from_iso("P1Y")), _elo_dt(2027, 1, 31))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P1M1D")), _elo_dt(2026, 4, 2))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 1, 31), EloDuration.from_iso("P1M1D")), _elo_dt(2026, 3, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), EloDuration.from_iso("P1Y1M1D")), _elo_dt(2027, 4, 2))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kAdd(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1M"))), _elo_dt(2026, 5, 1))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 3, 1), kAdd(EloDuration.from_iso("P1M"), EloDuration.from_iso("P1D"))), _elo_dt(2026, 4, 2))))(None)


(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 5, 15, 8, 0, 0), EloDuration.from_iso("P1M")), _elo_dt(2026, 6, 15, 8, 0, 0))))(None)
(lambda _: kAssert(kEq(kSub(_elo_dt(2026, 6, 30, 8, 0, 0), EloDuration.from_iso("P1M")), _elo_dt(2026, 5, 30, 8, 0, 0))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2026, 5, 31, 8, 0, 0), EloDuration.from_iso("P1M")), _elo_dt(2026, 6, 30, 8, 0, 0))))(None)
