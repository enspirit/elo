














(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00", "UTC").hour == 10))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:30:00", "UTC").minute == 30))(None)
(lambda _: kAssert(kParseDate("2026-01-15", "UTC").day == 15))(None)



(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00Z", "UTC").hour == 10))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00+00:00", "UTC").hour == 10))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00-00:00", "UTC").hour == 10))(None)




(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00+01:00", "UTC").hour == 9))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00+05:30", "UTC").hour == 4))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00+05:30", "UTC").minute == 30))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00-05:00", "UTC").hour == 15))(None)


(lambda _: kAssert(kParseDatetime("2026-01-15T00:30:00+02:00", "UTC").day == 14))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T00:30:00+02:00", "UTC").hour == 22))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T23:30:00-02:00", "UTC").day == 16))(None)




(lambda _: kAssert(kEq(kParseDatetime("2026-01-15T10:00:00+01:00", "UTC"), kParseDatetime("2026-01-15T09:00:00Z", "UTC"))))(None)
(lambda _: kAssert(kEq(kParseDatetime("2026-01-15T12:00:00+03:00", "UTC"), kParseDatetime("2026-01-15T10:00:00+01:00", "UTC"))))(None)
(lambda _: kAssert(kParseDatetime("2026-01-15T10:00:00+01:00", "UTC") < kParseDatetime("2026-01-15T10:00:00Z", "UTC")))(None)



(lambda _: kAssert(kEq(kParseDate(kParseDatetime("2026-01-15T00:30:00+02:00", "UTC"), "UTC"), _elo_dt(2026, 1, 14))))(None)
