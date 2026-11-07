








(lambda _: kAssert(kPow(2, 10) == 1024))(None)
(lambda _: kAssert(kPow(2, 1) == 2))(None)
(lambda _: kAssert(kPow(2, 0) == 1))(None)
(lambda _: kAssert(kPow(9, 0.5) == 3))(None)

(lambda _: kAssert(kPow(2, -1) == 0.5))(None)
(lambda _: kAssert(kPow(2, -2) == 0.25))(None)
(lambda _: kAssert(kPow(4, -1) == 0.25))(None)
(lambda _: kAssert(kPow(10, -3) == 0.001))(None)


(lambda _: kAssert(kTypeOf(kPow(2, -1)) == "Float"))(None)
(lambda _: kAssert(kTypeOf(kPow(2, -2)) == "Float"))(None)
(lambda _: kAssert((kPow(2, -1) is None) == False))(None)


(lambda _: kAssert(kPow(2, -1) + 0.5 == 1))(None)
(lambda _: kAssert(kPow(2, -1) * 4 == 2))(None)
(lambda _: kAssert((e := -1, kPow(2, e))[-1] == 0.5))(None)






(lambda _: kAssert(kRound(kPow(2, -1)) == 1))(None)
(lambda _: kAssert(kRound(kPow(2, -2)) == 0))(None)
(lambda _: kAssert(math.floor(kPow(2, -1)) == 0))(None)
(lambda _: kAssert(math.ceil(kPow(2, -1)) == 1))(None)
(lambda _: kAssert(math.floor(kPow(2, 10)) == 1024))(None)
(lambda _: kAssert(kRound(kPow(2, 10)) == 1024))(None)



(lambda _: kAssert(kPow(2, 3) / 2 == 4))(None)
(lambda _: kAssert(kPow(2, 3) / 16 == 0.5))(None)
(lambda _: kAssert(kPow(5, 1) / 2 == 2.5))(None)
