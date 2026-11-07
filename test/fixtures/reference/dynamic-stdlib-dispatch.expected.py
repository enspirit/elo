
















(lambda _: kAssert(kEq((f := lambda s: s.strip(), f("  a  "))[-1], "a")))(None)
(lambda _: kAssert(kEq((f := lambda s: s.lstrip(), f("  a"))[-1], "a")))(None)
(lambda _: kAssert(kEq((f := lambda s: s.rstrip(), f("a  "))[-1], "a")))(None)
(lambda _: kAssert(kEq((f := lambda s: (len(s) == 0), f(""))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda s: (len(s.strip()) == 0), f("  "))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda s: s + "b", f("a"))[-1], "ab")))(None)
(lambda _: kAssert(kEq((f := lambda s: s.startswith("ab"), f("abc"))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda s: s.endswith("bc"), f("abc"))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda s: kIndexOf(s, "b"), f("abc"))[-1], 1)))(None)
(lambda _: kAssert(kEq((f := lambda s: kSplit(s, ","), f("a,b"))[-1], ["a", "b"])))(None)
(lambda _: kAssert(kEq((f := lambda s: s[1:1 + 2], f("abcd"))[-1], "bc")))(None)
(lambda _: kAssert(kEq((f := lambda s: s[1:3], f("abcd"))[-1], "bc")))(None)
(lambda _: kAssert(kEq((f := lambda s: s.replace("a", "z", 1), f("aba"))[-1], "zba")))(None)
(lambda _: kAssert(kEq((f := lambda s: s.replace("a", "z"), f("aba"))[-1], "zbz")))(None)
(lambda _: kAssert(kEq((f := lambda s: kPad(s, 3, "0", True), f("7"))[-1], "007")))(None)
(lambda _: kAssert(kEq((f := lambda s: kPad(s, 3, "0", False), f("7"))[-1], "700")))(None)
(lambda _: kAssert(kEq((f := lambda s: (lambda s: (lambda _m: {"n": _m.group(1)} if _m else {"n": None})(re.search('id=(.*)$', s)))(s).get("n"), f("id=42"))[-1], "42")))(None)


(lambda _: kAssert(kEq((f := lambda xs: list(map(lambda x: kMul(x, 2), xs)), f([1, 2]))[-1], [2, 4])))(None)
(lambda _: kAssert(kEq((f := lambda xs: list(filter(lambda x: (x > 1), xs)), f([1, 2]))[-1], [2])))(None)
(lambda _: kAssert(kEq((f := lambda xs: all(map(lambda x: (x > 0), xs)), f([1, 2]))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda xs: any(map(lambda x: (x > 1), xs)), f([1, 2]))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda xs: next(filter(lambda x: (x > 1), xs), None), f([1, 2]))[-1], 2)))(None)
(lambda _: kAssert(kEq((f := lambda xs: sorted(xs, key=lambda x: kNeg(x)), f([1, 2]))[-1], [2, 1])))(None)
(lambda _: kAssert(kEq((f := lambda xs: functools.reduce(lambda a, x: kAdd(a, x), xs, 0), f([1, 2]))[-1], 3)))(None)
(lambda _: kAssert(kEq((f := lambda xs: "-".join(xs), f(["a", "b"]))[-1], "a-b")))(None)


(lambda _: kAssert(kEq((f := lambda b: not b, f(False))[-1], True)))(None)
(lambda _: kAssert(kEq((f := lambda n: n, f(3))[-1], 3)))(None)
(lambda _: kAssert(kEq((f := lambda x: kRoundTo(x, 1), f(1.25))[-1], 1.3)))(None)


(lambda _: kAssert("  a  ".strip() == "a"))(None)
(lambda _: kAssert((len("  ".strip()) == 0) == True))(None)
(lambda _: kAssert("a" + "b" == "ab"))(None)
(lambda _: kAssert(kEq(kIndexOf("abc", "b"), 1)))(None)
(lambda _: kAssert("abcd"[1:1 + 2] == "bc"))(None)
(lambda _: kAssert("aba".replace("a", "z") == "zbz"))(None)
(lambda _: kAssert(kPad("7", 3, "0", True) == "007"))(None)
(lambda _: kAssert(kEq((lambda s: (lambda _m: {"n": _m.group(1)} if _m else {"n": None})(re.search('id=(.*)$', s)))("id=42").get("n"), "42")))(None)
(lambda _: kAssert(kEq(list(map(lambda x: kMul(x, 2), [1, 2])), [2, 4])))(None)
(lambda _: kAssert(kEq(functools.reduce(lambda a, x: kAdd(a, x), [1, 2], 0), 3)))(None)
(lambda _: kAssert("-".join(["a", "b"]) == "a-b"))(None)
(lambda _: kAssert(not False == True))(None)
(lambda _: kAssert(kRoundTo(1.25, 1) == 1.3))(None)
