(lambda _: kAssert(kEq(kSplit("a,b,c", ","), ["a", "b", "c"])))(None)
(lambda _: kAssert(kEq(kSplit("hello world", " "), ["hello", "world"])))(None)
(lambda _: kAssert(kEq(kSplit("one", ","), ["one"])))(None)
(lambda _: kAssert(kEq(kSplit("", ","), [])))(None)


(lambda _: kAssert(kEq(kSplit("abc", ""), ["a", "b", "c"])))(None)
(lambda _: kAssert(kEq(kSplit("9", ""), ["9"])))(None)
(lambda _: kAssert(kEq(kSplit("", ""), [])))(None)
(lambda _: kAssert(len(kSplit("BE68539007547034", "")) == 16))(None)
