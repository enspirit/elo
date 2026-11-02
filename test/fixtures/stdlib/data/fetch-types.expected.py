







(lambda _: kAssert(kEq(kFetch({"v": "x"}, ["v"]), "x")))(None)
(lambda _: kAssert(not kEq(kFetch({"v": "x"}, ["v"]), "y")))(None)
(lambda _: kAssert(kEq(kFetch({"v": 42}, ["v"]), 42)))(None)
(lambda _: kAssert(not kEq(kFetch({"v": 42}, ["v"]), 43)))(None)
(lambda _: kAssert(kEq(kFetch({"v": 1.5}, ["v"]), 1.5)))(None)
(lambda _: kAssert(kEq(kFetch({"v": True}, ["v"]), True)))(None)
(lambda _: kAssert(kEq(kFetch({"v": False}, ["v"]), False)))(None)
(lambda _: kAssert(kEq(kFetch({"v": [1, 2]}, ["v"]), [1, 2])))(None)
(lambda _: kAssert(kEq(kFetch({"v": {"a": 1}}, ["v"]), {"a": 1})))(None)
(lambda _: kAssert(kEq(kFetch({"v": _elo_dt(2024, 1, 15)}, ["v"]), _elo_dt(2024, 1, 15))))(None)



(lambda _: kAssert(kEq(kFetch({"a": {"b": 7}}, ["a", "b"]), 7)))(None)
(lambda _: kAssert(kEq(kFetch({"a": {"b": {"c": "deep"}}}, ["a", "b", "c"]), "deep")))(None)


(lambda _: kAssert(kEq({"v": 42}.get("v"), 42)))(None)
(lambda _: kAssert(kEq(kData("{\"v\": 42}").get("v"), 42)))(None)
(lambda _: kAssert(kEq(kData("{\"v\": \"x\"}").get("v"), "x")))(None)
(lambda _: kAssert(kEq(kData("{\"v\": true}").get("v"), True)))(None)
(lambda _: kAssert(kEq(kData("{\"v\": 1.5}").get("v"), 1.5)))(None)
(lambda _: kAssert(kEq(kData("{\"a\": {\"b\": 7}}").get("a").get("b"), 7)))(None)
(lambda _: kAssert(kEq(kData("{\"a\": {\"b\": {\"c\": \"deep\"}}}").get("a").get("b").get("c"), "deep")))(None)
