(lambda _: kAssert("  hello".lstrip() == "hello"))(None)
(lambda _: kAssert("  hello  ".lstrip() == "hello  "))(None)
(lambda _: kAssert("hello".lstrip() == "hello"))(None)
(lambda _: kAssert("   ".lstrip() == ""))(None)
