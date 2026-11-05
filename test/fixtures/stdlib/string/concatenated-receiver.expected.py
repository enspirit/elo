








(lambda _: kAssert(("ab" + "cd").startswith("abc") == True))(None)
(lambda _: kAssert(("ab" + "cd").endswith("bcd") == True))(None)
(lambda _: kAssert(("bc" in "ab" + "cd") == True))(None)
(lambda _: kAssert(kEq(kIndexOf("ab" + "cd", "c"), 2)))(None)
(lambda _: kAssert("ab" + "cd" + "e" == "abcde"))(None)
(lambda _: kAssert(("ab" + "cd")[1:1 + 2] == "bc"))(None)
(lambda _: kAssert(("ab" + "cd")[1:3] == "bc"))(None)
(lambda _: kAssert(("ab" + "cd").replace("c", "Z", 1) == "abZd"))(None)
(lambda _: kAssert(("ab" + "cdc").replace("c", "Z") == "abZdZ"))(None)
(lambda _: kAssert(kPad("a" + "b", 4, "0", True) == "00ab"))(None)
(lambda _: kAssert(kPad("a" + "b", 4, "0", False) == "ab00"))(None)
(lambda _: kAssert(kEq(kSplit("a," + "b", ","), ["a", "b"])))(None)
(lambda _: kAssert(("ab" + "cd")[::-1] == "dcba"))(None)
(lambda _: kAssert((len("a" + "b") == 0) == False))(None)
(lambda _: kAssert((len((" " + " ").strip()) == 0) == True))(None)
(lambda _: kAssert(len("ab" + "cd") == 4))(None)
(lambda _: kAssert(("ab" + "cd").upper() == "ABCD"))(None)
