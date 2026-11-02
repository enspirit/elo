








(lambda _: kAssert(2 ** 10 == 1024))(None)
(lambda _: kAssert(2 ** 1 == 2))(None)
(lambda _: kAssert(2 ** 0 == 1))(None)
(lambda _: kAssert(9 ** 0.5 == 3))(None)

(lambda _: kAssert(2 ** -1 == 0.5))(None)
(lambda _: kAssert(2 ** -2 == 0.25))(None)
(lambda _: kAssert(4 ** -1 == 0.25))(None)
(lambda _: kAssert(10 ** -3 == 0.001))(None)


(lambda _: kAssert(kTypeOf(2 ** -1) == "Float"))(None)
(lambda _: kAssert(kTypeOf(2 ** -2) == "Float"))(None)
(lambda _: kAssert((2 ** -1 is None) == False))(None)


(lambda _: kAssert(2 ** -1 + 0.5 == 1))(None)
(lambda _: kAssert(2 ** -1 * 4 == 2))(None)
(lambda _: kAssert((e := -1, 2 ** e)[-1] == 0.5))(None)






(lambda _: kAssert(kRound(2 ** -1) == 1))(None)
(lambda _: kAssert(kRound(2 ** -2) == 0))(None)
(lambda _: kAssert(math.floor(2 ** -1) == 0))(None)
(lambda _: kAssert(math.ceil(2 ** -1) == 1))(None)
(lambda _: kAssert(math.floor(2 ** 10) == 1024))(None)
(lambda _: kAssert(kRound(2 ** 10) == 1024))(None)



(lambda _: kAssert(2 ** 3 / 2 == 4))(None)
(lambda _: kAssert(2 ** 3 / 16 == 0.5))(None)
(lambda _: kAssert(5 ** 1 / 2 == 2.5))(None)
