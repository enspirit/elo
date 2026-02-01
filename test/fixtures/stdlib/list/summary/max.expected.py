(lambda _: kAssert((lambda a: max(a) if a else None)([3, 1, 4, 1, 5]) == 5))(None)
(lambda _: kAssert((lambda a: max(a) if a else None)([42]) == 42))(None)
(lambda _: kAssert((lambda a: max(a) if a else None)([-3, -1, -4]) == -1))(None)
(lambda _: kAssert(((lambda a: max(a) if a else None)([]) is None)))(None)
