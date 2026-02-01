(lambda _: kAssert(next(filter(lambda x: x > 1, [1, 2, 3]), None) == 2))(None)
(lambda _: kAssert(next(filter(lambda x: x > 5, [1, 2, 3]), None) == None))(None)
(lambda _: kAssert(next(filter(lambda x: x > 0, []), None) == None))(None)
(lambda _: kAssert(next(filter(lambda x: len(x) > 5, ["apple", "banana", "cherry"]), None) == "banana"))(None)
