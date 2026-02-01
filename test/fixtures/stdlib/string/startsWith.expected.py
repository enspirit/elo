(lambda _: kAssert("hello world".startswith("hello")))(None)
(lambda _: kAssert(not ("hello world".startswith("world"))))(None)
