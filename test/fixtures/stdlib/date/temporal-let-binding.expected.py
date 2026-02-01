(lambda _: kAssert(kTypeOf((x := _elo_dt(_dt.datetime.now().year, _dt.datetime.now().month, _dt.datetime.now().day), kAdd(x, EloDuration.from_iso("P1D")))[-1]) == "DateTime"))(None)
(lambda _: kAssert(kTypeOf((d := EloDuration.from_iso("P1D"), kAdd(_elo_dt(_dt.datetime.now().year, _dt.datetime.now().month, _dt.datetime.now().day), d))[-1]) == "DateTime"))(None)
(lambda _: kAssert(kTypeOf((x := _elo_dt(_dt.datetime.now().year, _dt.datetime.now().month, _dt.datetime.now().day), d := EloDuration.from_iso("P1D"), kAdd(x, d))[-1]) == "DateTime"))(None)
