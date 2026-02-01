(lambda _: kAssert((lambda a: [x for i, x in enumerate(a) if not any(kEq(x, a[j]) for j in range(i))])([[1, 2], [3, 4], [1, 2]]) == [[1, 2], [3, 4]]))(None)
(lambda _: kAssert((lambda a: [x for i, x in enumerate(a) if not any(kEq(x, a[j]) for j in range(i))])([{"a": 1}, {"b": 2}, {"a": 1}]) == [{"a": 1}, {"b": 2}]))(None)
