
















(lambda _: kAssert((_p_Integer := pInt, Integer := lambda v: pUnwrap(_p_Integer(v, '')), Integer("42"))[-1] == 42))(None)
(lambda _: kAssert(kEq((f := lambda x, y: kMul(x, y), f(2, 3))[-1], 6)))(None)
(lambda _: kAssert((_p_String := pInt, String := lambda v: pUnwrap(_p_String(v, '')), String("7"))[-1] == 7))(None)
(lambda _: kAssert(kStrMul("ab", 2) == "abab"))(None)
(lambda _: kAssert((_p_Hash := pInt, Hash := lambda v: pUnwrap(_p_Hash(v, '')), Hash("1"))[-1] == 1))(None)
(lambda _: kAssert({"a": 1}.get("a") == 1))(None)
