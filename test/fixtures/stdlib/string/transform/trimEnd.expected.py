(lambda _: kAssert("hello  ".rstrip() == "hello"))(None)
(lambda _: kAssert("  hello  ".rstrip() == "  hello"))(None)
(lambda _: kAssert("hello".rstrip() == "hello"))(None)
(lambda _: kAssert("   ".rstrip() == ""))(None)
