




















(lambda _: kAssert(kEq(kPatch([], [2], 7), [None, None, 7])))(None)
(lambda _: kAssert(kAssertFails(lambda : kPatch([], [20000000], 1))))(None)
(lambda _: kAssert(kAssertFails(lambda : kPatch({"a": []}, ["a", 20000000], 1))))(None)



(lambda _: kAssert(kEq((f := lambda s, n: kPad(s, n, "-", True), f("x", 3))[-1], "--x")))(None)
(lambda _: kAssert(kEq((f := lambda s, n: kPad(s, n, "-", False), f("x", 3))[-1], "x--")))(None)
(lambda _: kAssert((f := lambda s, n: kPad(s, n, "-", True), kAssertFails(lambda : f("x", 10000001)))[-1]))(None)
(lambda _: kAssert((f := lambda s, n: kPad(s, n, "-", False), kAssertFails(lambda : f("x", 10000001)))[-1]))(None)



(lambda _: kAssert((f := lambda xs, i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i), (f([1, 2], "x") is None))[-1] == True))(None)
(lambda _: kAssert((f := lambda xs, i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i), (f("notalist", 0) is None))[-1] == True))(None)
(lambda _: kAssert(kEq((f := lambda xs, i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i), f([1, 2], 1))[-1], 2)))(None)
