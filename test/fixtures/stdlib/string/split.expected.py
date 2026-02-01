(lambda _: kAssert(kSplit("a,b,c", ",") == ["a", "b", "c"]))(None)
(lambda _: kAssert(kSplit("hello world", " ") == ["hello", "world"]))(None)
(lambda _: kAssert(kSplit("one", ",") == ["one"]))(None)
(lambda _: kAssert(kSplit("", ",") == []))(None)
