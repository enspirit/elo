



















(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f([1, 2], [3, 4]))[-1], [1, 2, 3, 4])))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(["a"], ["b", "c"]))[-1], ["a", "b", "c"])))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f([], [1]))[-1], [1])))(None)
(lambda _: kAssert(kEq(len((f := lambda a, b: kAdd(a, b), f([1, 2], [3, 4]))[-1]), 4)))(None)


(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f("ab", "cd"))[-1], "abcd")))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(1, 2))[-1], 3)))(None)


(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(EloDuration.from_iso("P1D"), _elo_dt(2024, 1, 15)))[-1], _elo_dt(2024, 1, 16))))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(EloDuration.from_iso("PT1H"), _elo_dt(2024, 1, 15, 10, 0, 0)))[-1], _elo_dt(2024, 1, 15, 11, 0, 0))))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(_elo_dt(2024, 1, 15), EloDuration.from_iso("P1D")))[-1], _elo_dt(2024, 1, 16))))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kAdd(a, b), f(EloDuration.from_iso("P1D"), EloDuration.from_iso("P2D")))[-1], EloDuration.from_iso("P3D"))))(None)


(lambda _: kAssert(kTypeOf((f := lambda a, b: kDiv(a, b), f(EloDuration.from_iso("P2D"), 2))[-1]) == "Duration"))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(EloDuration.from_iso("P2D"), 2))[-1], EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kTypeOf((f := lambda a, b: kMul(a, b), f(EloDuration.from_iso("P1D"), 2))[-1]) == "Duration"))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kMul(a, b), f(EloDuration.from_iso("P1D"), 2))[-1], EloDuration.from_iso("P2D"))))(None)
(lambda _: kAssert(kEq((f := lambda a, b: kDiv(a, b), f(5, 2))[-1], 2.5)))(None)


(lambda _: kAssert(kEq((f := lambda i: kParseDuration(i), f(EloInterval(_elo_dt(2024, 1, 1, 10, 0, 0), _elo_dt(2024, 1, 1, 12, 0, 0))))[-1], EloDuration.from_iso("PT2H"))))(None)
(lambda _: kAssert(kEq((f := lambda i: kParseDuration(i), f(EloInterval(_elo_dt(2024, 1, 1, 0, 0, 0), _elo_dt(2024, 1, 2, 0, 0, 0))))[-1], EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kEq((f := lambda d: kParseDuration(d), f(EloDuration.from_iso("P1D")))[-1], EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kEq((f := lambda s: kParseDuration(s), f("PT2H"))[-1], EloDuration.from_iso("PT2H"))))(None)


(lambda _: kAssert(kEq([1, 2] + [3, 4], [1, 2, 3, 4])))(None)
(lambda _: kAssert(kEq(["a"] + ["b", "c"], ["a", "b", "c"])))(None)
(lambda _: kAssert("ab" + "cd" == "abcd"))(None)
(lambda _: kAssert(kEq(kAdd(EloDuration.from_iso("P1D"), _elo_dt(2024, 1, 15)), _elo_dt(2024, 1, 16))))(None)
(lambda _: kAssert(kEq(kAdd(EloDuration.from_iso("PT1H"), _elo_dt(2024, 1, 15, 10, 0, 0)), _elo_dt(2024, 1, 15, 11, 0, 0))))(None)
(lambda _: kAssert(kEq(kAdd(_elo_dt(2024, 1, 15), EloDuration.from_iso("P1D")), _elo_dt(2024, 1, 16))))(None)
(lambda _: kAssert((kAdd(EloDuration.from_iso("P1D"), EloDuration.from_iso("P2D")) == EloDuration.from_iso("P3D"))))(None)
(lambda _: kAssert(kTypeOf(kDiv(EloDuration.from_iso("P2D"), 2)) == "Duration"))(None)
(lambda _: kAssert((kDiv(EloDuration.from_iso("P2D"), 2) == EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert(kTypeOf(kMul(EloDuration.from_iso("P1D"), 2)) == "Duration"))(None)
(lambda _: kAssert(5 / 2 == 2.5))(None)
(lambda _: kAssert((EloDuration.from_timedelta(EloInterval(_elo_dt(2024, 1, 1, 10, 0, 0), _elo_dt(2024, 1, 1, 12, 0, 0)).end - EloInterval(_elo_dt(2024, 1, 1, 10, 0, 0), _elo_dt(2024, 1, 1, 12, 0, 0)).start) == EloDuration.from_iso("PT2H"))))(None)
(lambda _: kAssert((EloDuration.from_iso("P1D") == EloDuration.from_iso("P1D"))))(None)
(lambda _: kAssert((kParseDuration("PT2H") == EloDuration.from_iso("PT2H"))))(None)
