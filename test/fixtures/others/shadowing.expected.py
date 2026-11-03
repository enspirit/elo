


(lambda _: kAssert((x := 1, x__2 := x + 1, x__2__2 := 100, x__2 + x__2__2)[-1] == 102))(None)
(lambda _: kAssert(kEq((x := 1, x__2 := 2, list(map(lambda x__2__2: kAdd(x__2__2, x__2), [1])))[-1], [3])))(None)
(lambda _: kAssert((x := 1, x__2 := x + 1, x__3 := x__2 + 1, x__3)[-1] == 3))(None)
(lambda _: kAssert((x := 1, x__2 := x + 1, x__2)[-1] + (x := 5, x)[-1] == 7))(None)

(lambda _: kAssert((x := 1, kEq(list(map(lambda x: kMul(x, 2), [10])), [20]) and x == 1)[-1]))(None)
(lambda _: kAssert((___2 := 1, ___2)[-1] == 1))(None)

(lambda _: kAssert(kEq((_p_T := pInt, T := lambda v: pUnwrap(_p_T(v, '')), (_p_T__2 := pArray(_p_T), T__2 := lambda v: pUnwrap(_p_T__2(v, '')), T__2(["1", "2"]))[-1])[-1], [1, 2])))(None)
(lambda _: kAssert((i := 100, (_p_T := pSubtype(pInt, [("constraint failed", None, lambda i__2: (i__2 > 0))]), T := lambda v: pUnwrap(_p_T(v, '')), T("5") + i)[-1])[-1] == 105))(None)
