(lambda _: kAssert(sorted(["banana", "apple", "cherry"], key=lambda x: len(x)) == ["apple", "banana", "cherry"]))(None)
(lambda _: kAssert(sorted([3, 1, 2], key=lambda x: x) == [1, 2, 3]))(None)
(lambda _: kAssert(sorted([], key=lambda x: x) == []))(None)
