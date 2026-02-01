(lambda _: kAssert(functools.reduce(lambda acc, x: acc + x, [1, 2, 3], 0) == 6))(None)
(lambda _: kAssert(functools.reduce(lambda acc, x: acc + x, ["a", "b", "c"], "") == "abc"))(None)
