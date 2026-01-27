(lambda _: kAssert(kEq([1, 2, 3], [1, 2, 3])))(None)
(lambda _: kAssert(kEq([1], [1])))(None)
(lambda _: kAssert({"a": 1, "b": 2}.get("a") == 1))(None)
(lambda _: kAssert({"a": 1}.get("a") == 1))(None)
(lambda _: kAssert((x := 2, y := 3, x * y)[-1] == 6))(None)
(lambda _: kAssert((x := 2, x * 2)[-1] == 4))(None)

