(lambda _: kAssert(("lo wo" in "hello world")))(None)
(lambda _: kAssert(("hello" in "hello world")))(None)
(lambda _: kAssert(not (("xyz" in "hello world"))))(None)
