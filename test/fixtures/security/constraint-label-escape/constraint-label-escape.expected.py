(lambda _: kAssert((_p_T := pSubtype(pInt, [("constraint 'bad\\' failed", "bad\\", lambda i: (i > 0))]), T := lambda v: pUnwrap(_p_T(v, '')), T(5))[-1] == 5))(None)
(lambda _: kAssert((_p_T := pSubtype(pInt, [("constraint 'weird'quote' failed", "weird'quote", lambda i: (i > 0))]), T := lambda v: pUnwrap(_p_T(v, '')), T(5))[-1] == 5))(None)
