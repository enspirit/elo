(lambda _: kAssert(",".join(["a", "b", "c"]) == "a,b,c"))(None)
(lambda _: kAssert(" ".join(["hello", "world"]) == "hello world"))(None)
(lambda _: kAssert("-".join(["one"]) == "one"))(None)
(lambda _: kAssert(",".join([]) == ""))(None)
