(lambda _: kAssert(kEq([x for sub in [[1, 2], [3, 4]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2, 3, 4])))(None)
(lambda _: kAssert(kEq([x for sub in [[1], [2], [3]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2, 3])))(None)
(lambda _: kAssert(kEq([x for sub in [[], [1, 2]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2])))(None)
(lambda _: kAssert(kEq([x for sub in [] for x in (sub if isinstance(sub, list) else [sub])], [])))(None)





(lambda _: kAssert(kEq([x for sub in [[1], [2, 3]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2, 3])))(None)
(lambda _: kAssert(kEq([x for sub in [[1, 2, 3], [4]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2, 3, 4])))(None)
(lambda _: kAssert(kEq([x for sub in [[1, 2], []] for x in (sub if isinstance(sub, list) else [sub])], [1, 2])))(None)
(lambda _: kAssert(kEq([x for sub in [[], []] for x in (sub if isinstance(sub, list) else [sub])], [])))(None)
(lambda _: kAssert(kEq([x for sub in [[1, 2]] for x in (sub if isinstance(sub, list) else [sub])], [1, 2])))(None)


(lambda _: kAssert(kEq([x for sub in [["a"], ["b", "c"]] for x in (sub if isinstance(sub, list) else [sub])], ["a", "b", "c"])))(None)
(lambda _: kAssert(kEq([x for sub in [1, 2] for x in (sub if isinstance(sub, list) else [sub])], [1, 2])))(None)
