













(lambda _: kAssert(kEq((f := lambda x: kToString(x), f("hello"))[-1], "hello")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(""))[-1], "")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f("it's"))[-1], "it's")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f("[1, 2]"))[-1], "[1, 2]")))(None)


(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(123))[-1], "123")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(True))[-1], "true")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(False))[-1], "false")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(None))[-1], "null")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f([1, 2, 3]))[-1], "[1, 2, 3]")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f(["a", "b"]))[-1], "['a', 'b']")))(None)
(lambda _: kAssert(kEq((f := lambda x: kToString(x), f({"name": "Alice"}))[-1], "{name: 'Alice'}")))(None)



(lambda _: kAssert(kToString(["a", "b"]) == "['a', 'b']"))(None)
(lambda _: kAssert(kToString({"name": "Alice"}) == "{name: 'Alice'}"))(None)
