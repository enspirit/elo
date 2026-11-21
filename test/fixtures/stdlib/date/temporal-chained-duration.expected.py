(lambda _: kAssert(kTypeOf(kAdd(kAdd(_elo_today("UTC"), EloDuration.from_iso("P1M")), EloDuration.from_iso("PT12H"))) == "DateTime"))(None)
