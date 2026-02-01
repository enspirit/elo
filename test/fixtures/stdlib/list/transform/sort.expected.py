(lambda _: kAssert(sorted([3, 1, 4, 1, 5]) == [1, 1, 3, 4, 5]))(None)
(lambda _: kAssert(sorted(["banana", "apple", "cherry"]) == ["apple", "banana", "cherry"]))(None)
(lambda _: kAssert(sorted([]) == []))(None)
(lambda _: kAssert(sorted([1]) == [1]))(None)
