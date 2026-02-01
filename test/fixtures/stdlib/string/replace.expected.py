(lambda _: kAssert("hello world".replace("world", "there", 1) == "hello there"))(None)
(lambda _: kAssert("abab".replace("ab", "x", 1) == "xab"))(None)
(lambda _: kAssert("abab".replace("ab", "x") == "xx"))(None)
