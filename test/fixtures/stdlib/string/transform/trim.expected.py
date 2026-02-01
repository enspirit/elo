(lambda _: kAssert("  hello  ".strip() == "hello"))(None)
(lambda _: kAssert("no spaces".strip() == "no spaces"))(None)
(lambda _: kAssert("   ".strip() == ""))(None)
(lambda _: kAssert((" hello " + " world ").strip() == "hello  world"))(None)
