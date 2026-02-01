(lambda _: kAssert((len("".strip()) == 0)))(None)
(lambda _: kAssert((len("   ".strip()) == 0)))(None)
(lambda _: kAssert(not ((len("hello".strip()) == 0))))(None)
(lambda _: kAssert(not ((len(" hi ".strip()) == 0))))(None)
