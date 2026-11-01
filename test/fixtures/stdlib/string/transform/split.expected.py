(lambda _: kAssert(kEq(kSplit("a,b,c", ","), ["a", "b", "c"])))(None)
(lambda _: kAssert(kEq(kSplit("hello world", " "), ["hello", "world"])))(None)
(lambda _: kAssert(kEq(kSplit("one", ","), ["one"])))(None)
(lambda _: kAssert(kEq(kSplit("", ","), [])))(None)
