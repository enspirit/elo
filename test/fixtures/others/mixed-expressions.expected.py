(lambda _: kAssert(100 * 1.1 > 100))(None)
(lambda _: kAssert(10 * 5 - 10 == 40))(None)
(lambda _: kAssert(75 >= 50 and 75 <= 100))(None)
(lambda _: kAssert(50 > 0 and (True or 50 < 1000)))(None)
