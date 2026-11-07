

















(lambda _: kAssert(kEq((i := 1, kAt([10, 20, 30], i))[-1], 20)))(None)
(lambda _: kAssert(kEq((i := 2, kAt(["a", "b", "c"], i))[-1], "c")))(None)
(lambda _: kAssert(kEq((i := 1, kAt([10, 20, 30], i + 1))[-1], 30)))(None)
(lambda _: kAssert((i := 99, (kAt([10, 20, 30], i) is None))[-1] == True))(None)



(lambda _: kAssert(kEq((f := lambda xs, i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i), f([10, 20, 30], 2))[-1], 30)))(None)
(lambda _: kAssert(kEq((f := lambda xs, i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i), f(["a", "b"], 0))[-1], "a")))(None)
(lambda _: kAssert(kEq((f := lambda xs, i: ((lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i) is None), f([10, 20], 99))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda i: (lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)([10, 20, 30], i), f(1))[-1], 20)))(None)


(lambda _: kAssert(kEq((f := lambda xs, i: ((lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(a) else None)(xs, i) is None), f([10, 20], -1))[-1], True)))(None)
(lambda _: kAssert((i := -1, (kAt([10, 20], i) is None))[-1] == True))(None)
