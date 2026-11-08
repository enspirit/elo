








(lambda _: kAssert(kSub(_elo_start_of_day(_elo_dt(2026, 3, 11)), _elo_start_of_day(_elo_dt(2026, 1, 10))).in_days() == 60))(None)
(lambda _: kAssert(kSub(_elo_dt(2026, 3, 11), _elo_dt(2026, 1, 10)).in_days() == 60))(None)
(lambda _: kAssert(kSub(_elo_dt(2026, 11, 2), _elo_dt(2026, 10, 1)).in_days() == 32))(None)


(lambda _: kAssert(kSub(_elo_dt(2026, 3, 30), _elo_dt(2026, 3, 28)).in_days() == 2))(None)
(lambda _: kAssert(kSub(_elo_dt(2026, 10, 26), _elo_dt(2026, 10, 24)).in_days() == 2))(None)


(lambda _: kAssert(_elo_dt(2026, 1, 1, 0, 30, 0).year == 2026))(None)
(lambda _: kAssert(_elo_dt(2026, 1, 1, 0, 30, 0).month == 1))(None)
(lambda _: kAssert(_elo_dt(2026, 1, 1, 0, 30, 0).day == 1))(None)
(lambda _: kAssert(_elo_dt(2026, 1, 1, 0, 30, 0).hour == 0))(None)
(lambda _: kAssert(_elo_dt(2026, 12, 31, 23, 30, 0).day == 31))(None)
(lambda _: kAssert(_elo_dt(2026, 12, 31, 23, 30, 0).month == 12))(None)


(lambda _: kAssert(kEq(_elo_start_of_day(_elo_dt(2026, 1, 1, 0, 30, 0)), _elo_dt(2026, 1, 1, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_month(_elo_dt(2026, 3, 29, 23, 30, 0)), _elo_dt(2026, 3, 1, 0, 0, 0))))(None)
(lambda _: kAssert(_elo_end_of_day(_elo_dt(2026, 12, 31, 23, 30, 0)) < _elo_dt(2027, 1, 1, 0, 0, 0)))(None)


(lambda _: kAssert(kEq((lambda a: min(a) if a else None)([_elo_dt(2026, 1, 1, 0, 30, 0)]).day, 1)))(None)
(lambda _: kAssert(kEq(_elo_start_of_day((lambda a: min(a) if a else None)([_elo_dt(2026, 1, 1, 0, 30, 0)])), _elo_dt(2026, 1, 1, 0, 0, 0))))(None)


(lambda _: kAssert(kParseDatetime("2026-01-01T00:30:00Z", "UTC").day == 1))(None)
(lambda _: kAssert(kSub(kParseDate("2026-03-11", "UTC"), kParseDate("2026-01-10", "UTC")).in_days() == 60))(None)
