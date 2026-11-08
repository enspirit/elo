

















(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"a": 1, "b": 2}, {"x": ["a"], "y": ["b"]}))[-1], {"x": 1, "y": 2})))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"foo": {"bar": 10}}, {"v": ["foo", "bar"]}))[-1], {"v": 10})))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"items": [1, 2, 3]}, {"first": ["items", 0], "last": ["items", 2]}))[-1], {"first": 1, "last": 3})))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, {}))[-1], {})))(None)


(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"name": "Alice"}, ["name"]))[-1], "Alice")))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"user": {"name": "Bob"}}, ["user", "name"]))[-1], "Bob")))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"items": [10, 20, 30]}, ["items", 0]))[-1], 10)))(None)
(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f({"name": "Alice"}, ["missing"]))[-1] is None)))(None)
(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f(None, ["x"]))[-1] is None)))(None)


(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"x": 12}, "x"))[-1], 12)))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"x": 12}, ["x"]))[-1], 12)))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"user": {"name": "Bob"}}, ["user", "name"]))[-1], "Bob")))(None)


(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, 42))[-1] is None)))(None)
(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, None))[-1] is None)))(None)


(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, ["__proto__"]))[-1] is None)))(None)
(lambda _: kAssert(((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, ["constructor"]))[-1] is None)))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, {"k": ["__proto__"]}))[-1], {"k": None})))(None)


(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, {"k": 42}))[-1], {"k": None})))(None)
(lambda _: kAssert(kEq((f := lambda d, p: kFetchAny(d, p), f({"a": 1}, {"k": None}))[-1], {"k": None})))(None)
