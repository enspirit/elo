(lambda _: kAssert(kIndexOf("hello world", "world") == 6))(None)
(lambda _: kAssert(kIndexOf("hello world", "o") == 4))(None)
(lambda _: kAssert((kIndexOf("hello world", "xyz") is None) == True))(None)
