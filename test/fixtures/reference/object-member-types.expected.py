












(lambda _: kAssert(kEq({"a": 1}.get("a"), 1)))(None)
(lambda _: kAssert(not kEq({"a": 1}.get("a"), 2)))(None)
(lambda _: kAssert(kEq({"a": 1.5}.get("a"), 1.5)))(None)
(lambda _: kAssert(kEq({"a": 1.0}.get("a"), 1)))(None)
(lambda _: kAssert(kEq({"a": True}.get("a"), True)))(None)
(lambda _: kAssert(not kEq({"a": False}.get("a"), True)))(None)
(lambda _: kAssert(kEq({"a": "x"}.get("a"), "x")))(None)
(lambda _: kAssert(kEq({"a": _elo_dt(2024, 1, 15)}.get("a"), _elo_dt(2024, 1, 15))))(None)
(lambda _: kAssert(kEq({"a": _elo_dt(2024, 1, 15, 10, 30, 0)}.get("a"), _elo_dt(2024, 1, 15, 10, 30, 0))))(None)


(lambda _: kAssert(kEq(kAdd({"a": 1}.get("a"), 1), 2)))(None)
(lambda _: kAssert(kEq(kSub({"a": 7}.get("a"), 2), 5)))(None)
(lambda _: kAssert(kEq(kMul({"a": 3}.get("a"), 3), 9)))(None)
(lambda _: kAssert(kEq(kDiv({"a": 10}.get("a"), 4), 2.5)))(None)
(lambda _: kAssert(kEq(kAdd({"a": 1, "b": 2}.get("a"), {"a": 1, "b": 2}.get("b")), 3)))(None)


(lambda _: kAssert(({"a": 10}.get("a") > 9)))(None)
(lambda _: kAssert(({"a": 10}.get("a") >= 10)))(None)
(lambda _: kAssert(({"a": 10}.get("a") < 11)))(None)
(lambda _: kAssert(({"a": 1, "b": 2}.get("a") < {"a": 1, "b": 2}.get("b"))))(None)




(lambda _: kAssert(kEq({"a": "x"}.get("a").upper(), "X")))(None)
(lambda _: kAssert(kEq({"a": " x "}.get("a").strip(), "x")))(None)


(lambda _: kAssert(kEq((o := {"n": 10}, o.get("n"))[-1], 10)))(None)
(lambda _: kAssert(kEq((o := {"n": 10}, kAdd(o.get("n"), 5))[-1], 15)))(None)
(lambda _: kAssert((o := {"x": "12"}, int(((_alt0) if (_alt0 := o.get("x")) is not None else (0))))[-1] == 12))(None)
