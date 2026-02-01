(lambda _: kAssert("hello world".endswith("world")))(None)
(lambda _: kAssert(not ("hello world".endswith("hello"))))(None)
