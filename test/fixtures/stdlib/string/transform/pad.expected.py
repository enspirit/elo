(lambda _: kAssert(kPad("42", 5, "0", True) == "00042"))(None)
(lambda _: kAssert(kPad("hi", 5, ".", False) == "hi..."))(None)
