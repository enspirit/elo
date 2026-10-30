(lambda _: kAssert((lambda a: max(a) if a else None)([3, 1, 4, 1, 5]) == 5))(None)
(lambda _: kAssert((lambda a: max(a) if a else None)([42]) == 42))(None)
(lambda _: kAssert((lambda a: max(a) if a else None)([-3, -1, -4]) == -1))(None)
(lambda _: kAssert(((lambda a: max(a) if a else None)([]) is None)))(None)


(lambda _: kAssert(kTypeOf((lambda a: max(a) if a else None)([_elo_start_of_day(_dt.datetime.now()), kSub(_elo_start_of_day(_dt.datetime.now()), EloDuration.from_iso("P1D"))])) == "DateTime"))(None)
(lambda _: kAssert((lambda a: max(a) if a else None)([_elo_start_of_day(_dt.datetime.now()), kSub(_elo_start_of_day(_dt.datetime.now()), EloDuration.from_iso("P1D"))]) == _elo_start_of_day(_dt.datetime.now())))(None)


(lambda _: kAssert(max(3, 7) == 7))(None)
(lambda _: kAssert(max(7, 3) == 7))(None)
(lambda _: kAssert(max(-5, 2) == 2))(None)
(lambda _: kAssert(max(4, 4) == 4))(None)
(lambda _: kAssert(max(2.5, 1.5) == 2.5))(None)
(lambda _: kAssert(max(1, 2.5) == 2.5))(None)

(lambda _: kAssert(max(min(15, 10), 0) == 10))(None)
(lambda _: kAssert(max(min(-3, 10), 0) == 0))(None)
(lambda _: kAssert(max(min(5, 10), 0) == 5))(None)
