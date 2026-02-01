(lambda _: kAssert([x for sub in [[1, 2], [3, 4]] for x in sub] == [1, 2, 3, 4]))(None)
(lambda _: kAssert([x for sub in [[1], [2], [3]] for x in sub] == [1, 2, 3]))(None)
(lambda _: kAssert([x for sub in [[], [1, 2]] for x in sub] == [1, 2]))(None)
(lambda _: kAssert([x for sub in [] for x in sub] == []))(None)
