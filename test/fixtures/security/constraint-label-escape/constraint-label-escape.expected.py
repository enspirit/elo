(lambda _: kAssert((_p_T := pSubtype(pInt, [("constraint 'bad\\' failed", lambda i: i > 0)]), T := lambda v: pUnwrap(_p_T(v, '')), T(5))[-1] == 5))(None)
(lambda _: kAssert((_p_T := pSubtype(pInt, [("constraint 'weird'quote' failed", lambda i: i > 0)]), T := lambda v: pUnwrap(_p_T(v, '')), T(5))[-1] == 5))(None)
