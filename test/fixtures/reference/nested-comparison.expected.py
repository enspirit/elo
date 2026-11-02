














(lambda _: kAssert((1 == 1) == True))(None)
(lambda _: kAssert((1 == 2) == False))(None)
(lambda _: kAssert((1 != 2) == True))(None)
(lambda _: kAssert((1 == 1) != False))(None)
(lambda _: kAssert((1 == 2) != True))(None)

(lambda _: kAssert((1 < 2) == True))(None)
(lambda _: kAssert((2 < 1) == False))(None)
(lambda _: kAssert((1 > 2) == False))(None)
(lambda _: kAssert((2 >= 2) == True))(None)
(lambda _: kAssert((2 <= 1) == False))(None)


(lambda _: kAssert((1 <= 2) == (3 > 2)))(None)
(lambda _: kAssert((1 > 2) == (3 < 2)))(None)
(lambda _: kAssert((1 >= 1) != (2 > 3)))(None)
(lambda _: kAssert((1 < 2) != (2 < 1)))(None)


(lambda _: kAssert(((1 == 1) == True) == True))(None)
(lambda _: kAssert(("a" == "a") == True))(None)
(lambda _: kAssert(((None is None) == True) == True))(None)
(lambda _: kAssert((kEq(_elo_dt(2024, 1, 15), _elo_dt(2024, 1, 15))) == True))(None)
