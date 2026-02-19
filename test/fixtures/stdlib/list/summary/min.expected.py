(lambda _: kAssert((lambda a: min(a) if a else None)([3, 1, 4, 1, 5]) == 1))(None)
(lambda _: kAssert((lambda a: min(a) if a else None)([42]) == 42))(None)
(lambda _: kAssert((lambda a: min(a) if a else None)([-3, -1, -4]) == -4))(None)
(lambda _: kAssert(((lambda a: min(a) if a else None)([]) is None)))(None)


(lambda _: kAssert(kTypeOf((lambda a: min(a) if a else None)([_elo_start_of_day(_dt.datetime.now()), kSub(_elo_start_of_day(_dt.datetime.now()), EloDuration.from_iso("P1D"))])) == "DateTime"))(None)
(lambda _: kAssert((lambda a: min(a) if a else None)([_elo_start_of_day(_dt.datetime.now()), kSub(_elo_start_of_day(_dt.datetime.now()), EloDuration.from_iso("P1D"))]) == kSub(_elo_start_of_day(_dt.datetime.now()), EloDuration.from_iso("P1D"))))(None)
