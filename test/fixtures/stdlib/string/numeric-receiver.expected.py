






(lambda _: kAssert("ab".upper() == "AB"))(None)
(lambda _: kAssert("AB".lower() == "ab"))(None)
(lambda _: kAssert(len("abc") == 3))(None)
(lambda _: kAssert("  a  ".strip() == "a"))(None)
(lambda _: kAssert(("a" + "b").upper() == "AB"))(None)
(lambda _: kAssert(len("ab" + "c") == 3))(None)
(lambda _: kAssert(kFirst(["ab"]).upper() == "AB"))(None)
