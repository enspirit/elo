(lambda _: kAssert(kTypeOf((x := _elo_today("UTC"), kAdd(x, EloDuration.from_iso("P1D")))[-1]) == "DateTime"))(None)
(lambda _: kAssert(kTypeOf((d := EloDuration.from_iso("P1D"), kAdd(_elo_today("UTC"), d))[-1]) == "DateTime"))(None)
(lambda _: kAssert(kTypeOf((x := _elo_today("UTC"), d := EloDuration.from_iso("P1D"), kAdd(x, d))[-1]) == "DateTime"))(None)
