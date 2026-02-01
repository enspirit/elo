(lambda _: kAssert("hello".upper() == "HELLO"))(None)
(lambda _: kAssert("MiXeD".upper() == "MIXED"))(None)
(lambda _: kAssert(("hello" + " " + "world").upper() == "HELLO WORLD"))(None)
