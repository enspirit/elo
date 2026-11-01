














(lambda _: kAssert(kEq(math.floor((lambda a: min(a) if a else None)([3.7])), 3)))(None)
(lambda _: kAssert(kEq(math.floor((lambda a: min(a) if a else None)([-3.2])), -4)))(None)
(lambda _: kAssert(kEq(math.floor((lambda a: min(a) if a else None)([5])), 5)))(None)
(lambda _: kAssert(kEq(math.ceil((lambda a: min(a) if a else None)([3.2])), 4)))(None)
(lambda _: kAssert(kEq(math.ceil((lambda a: min(a) if a else None)([-3.9])), -3)))(None)
(lambda _: kAssert(kEq(math.ceil((lambda a: min(a) if a else None)([5])), 5)))(None)
(lambda _: kAssert(kEq(kRound((lambda a: min(a) if a else None)([3.5])), 4)))(None)
(lambda _: kAssert(kEq(kRound((lambda a: min(a) if a else None)([-2.5])), -3)))(None)
(lambda _: kAssert(kEq(kRound((lambda a: min(a) if a else None)([5])), 5)))(None)


(lambda _: kAssert(kEq(_elo_start_of_day((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15, 10, 30, 0)])), _elo_dt(2024, 6, 15, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_day((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])), _elo_dt(2024, 6, 15, 0, 0, 0))))(None)
(lambda _: kAssert((_elo_end_of_day((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) >= _elo_dt(2024, 6, 15, 23, 59, 59))))(None)
(lambda _: kAssert((_elo_end_of_day((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) < _elo_dt(2024, 6, 16, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_week((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 12)])), _elo_dt(2024, 6, 10, 0, 0, 0))))(None)
(lambda _: kAssert((_elo_end_of_week((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 12)])) >= _elo_dt(2024, 6, 16, 23, 59, 59))))(None)
(lambda _: kAssert((_elo_end_of_week((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 12)])) < _elo_dt(2024, 6, 17, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_month((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])), _elo_dt(2024, 6, 1, 0, 0, 0))))(None)
(lambda _: kAssert((_elo_end_of_month((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) >= _elo_dt(2024, 6, 30, 23, 59, 59))))(None)
(lambda _: kAssert((_elo_end_of_month((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) < _elo_dt(2024, 7, 1, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_quarter((lambda a: min(a) if a else None)([_elo_dt(2024, 8, 15)])), _elo_dt(2024, 7, 1, 0, 0, 0))))(None)
(lambda _: kAssert((_elo_end_of_quarter((lambda a: min(a) if a else None)([_elo_dt(2024, 8, 15)])) >= _elo_dt(2024, 9, 30, 23, 59, 59))))(None)
(lambda _: kAssert((_elo_end_of_quarter((lambda a: min(a) if a else None)([_elo_dt(2024, 8, 15)])) < _elo_dt(2024, 10, 1, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_year((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])), _elo_dt(2024, 1, 1, 0, 0, 0))))(None)
(lambda _: kAssert((_elo_end_of_year((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) >= _elo_dt(2024, 12, 31, 23, 59, 59))))(None)
(lambda _: kAssert((_elo_end_of_year((lambda a: min(a) if a else None)([_elo_dt(2024, 6, 15)])) < _elo_dt(2025, 1, 1, 0, 0, 0))))(None)


(lambda _: kAssert(math.floor(3.7) == 3))(None)
(lambda _: kAssert(math.floor(-3.2) == -4))(None)
(lambda _: kAssert(math.ceil(3.2) == 4))(None)
(lambda _: kAssert(math.ceil(-3.9) == -3))(None)
(lambda _: kAssert(kRound(3.5) == 4))(None)
(lambda _: kAssert(kRound(-2.5) == -3))(None)
(lambda _: kAssert(kEq(_elo_start_of_day(_elo_dt(2024, 6, 15, 10, 30, 0)), _elo_dt(2024, 6, 15, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_day(_elo_dt(2024, 6, 15)), _elo_dt(2024, 6, 15, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_week(_elo_dt(2024, 6, 12)), _elo_dt(2024, 6, 10, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_month(_elo_dt(2024, 6, 15)), _elo_dt(2024, 6, 1, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_quarter(_elo_dt(2024, 8, 15)), _elo_dt(2024, 7, 1, 0, 0, 0))))(None)
(lambda _: kAssert(kEq(_elo_start_of_year(_elo_dt(2024, 6, 15)), _elo_dt(2024, 1, 1, 0, 0, 0))))(None)
