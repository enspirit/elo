
(lambda _: kAssert((kAssert(True, "guard failed"), 42)[-1] == 42))(None)


(lambda _: kAssert((kAssert(5 > 3, "guard failed"), 100)[-1] == 100))(None)


(lambda _: kAssert((kAssert(10 > 0, "guard 'positive' failed"), 10)[-1] == 10))(None)


(lambda _: kAssert((kAssert(7 > 0, "value must be positive"), 7)[-1] == 7))(None)


(lambda _: kAssert((kAssert(10 > 0, "guard failed"), kAssert(10 < 100, "guard failed"), 10)[-1] == 10))(None)


(lambda _: kAssert((kAssert(5 > 0, "guard 'positive' failed"), kAssert(5 < 10, "guard 'small' failed"), 5)[-1] == 5))(None)


(lambda _: kAssert((x := 5, (kAssert(x > 0, "guard failed"), x * 2)[-1])[-1] == 10))(None)


(lambda _: kAssert((kAssert(True, "check failed"), 99)[-1] == 99))(None)


(lambda _: kAssert((kAssert(3 > 0, "check 'valid' failed"), 3)[-1] == 3))(None)


(lambda _: kAssert((x := 10, (kAssert(x > 0, "check failed"), x + 5)[-1])[-1] == 15))(None)


(lambda _: kAssert((kAssert(1 > 0, "guard failed"), (x := 10, y := 20, x + y)[-1])[-1] == 30))(None)


(lambda _: kAssert((kAssert(True, "guard failed"), (kAssert(True, "guard failed"), 7)[-1])[-1] == 7))(None)


(lambda _: kAssert((kAssert(True, "guard failed"), (1) if (True) else (2))[-1] == 1))(None)

