









(lambda _: kAssert((t := _elo_now("UTC"), kEq(_elo_start_of_day(t), _elo_today("UTC")))[-1]))(None)
(lambda _: kAssert((t := _elo_now("UTC"), kEq(kParseDate(t), _elo_today("UTC")))[-1]))(None)
(lambda _: kAssert(_elo_now("UTC").day == _elo_today("UTC").day))(None)
(lambda _: kAssert(_elo_now("UTC").month == _elo_today("UTC").month))(None)
(lambda _: kAssert(_elo_now("UTC").year == _elo_today("UTC").year))(None)



(lambda _: kAssert((t := _elo_now("UTC"), kSub(t, _elo_start_of_day(t)).in_hours() >= t.hour)[-1]))(None)
(lambda _: kAssert((t := _elo_now("UTC"), kSub(t, _elo_start_of_day(t)).in_hours() < t.hour + 1)[-1]))(None)


(lambda _: kAssert((t := _elo_now("UTC"), kSub(t, _elo_start_of_day(t)).in_minutes() >= t.hour * 60 + t.minute)[-1]))(None)
(lambda _: kAssert((t := _elo_now("UTC"), kSub(t, _elo_start_of_day(t)).in_minutes() < t.hour * 60 + t.minute + 1)[-1]))(None)
