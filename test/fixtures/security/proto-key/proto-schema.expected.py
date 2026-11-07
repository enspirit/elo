

















(lambda _: kAssert(kEq((_p_T := pSchema([("__proto__", pInt, False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"__proto__": 1}))[-1], {"__proto__": 1})))(None)
(lambda _: kAssert(kEq((_p_T := pSchema([("__proto__", pInt, False), ("b", pInt, False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"__proto__": 1, "b": 2}))[-1], {"__proto__": 1, "b": 2})))(None)
(lambda _: kAssert(kEq((_p_T := pSchema([("__proto__", pSchema([("a", pInt, False)], "closed", None), False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"__proto__": {"a": 1}}))[-1], {"__proto__": {"a": 1}})))(None)
(lambda _: kAssert(kEq((_p_T := pSchema([("a", pInt, False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"a": 1}))[-1], {"a": 1})))(None)
