(lambda _: kAssert("hello"[0:0 + 2] == "he"))(None)
(lambda _: kAssert("hello"[1:1 + 3] == "ell"))(None)
(lambda _: kAssert("hello world"[6:6 + 5] == "world"))(None)
(lambda _: kAssert("hello"[2:2 + 100] == "llo"))(None)
