
(lambda _: kAssert((pAssert(True, "guard", None, "guard failed"), 42)[-1] == 42))(None)


(lambda _: kAssert((pAssert(5 > 3, "guard", None, "guard failed"), 100)[-1] == 100))(None)


(lambda _: kAssert((pAssert(10 > 0, "guard", "positive", "guard 'positive' failed"), 10)[-1] == 10))(None)


(lambda _: kAssert((pAssert(7 > 0, "guard", "value must be positive", "value must be positive"), 7)[-1] == 7))(None)


(lambda _: kAssert((pAssert(10 > 0, "guard", None, "guard failed"), pAssert(10 < 100, "guard", None, "guard failed"), 10)[-1] == 10))(None)


(lambda _: kAssert((pAssert(5 > 0, "guard", "positive", "guard 'positive' failed"), pAssert(5 < 10, "guard", "small", "guard 'small' failed"), 5)[-1] == 5))(None)


(lambda _: kAssert((x := 5, (pAssert(x > 0, "guard", None, "guard failed"), x * 2)[-1])[-1] == 10))(None)


(lambda _: kAssert((pAssert(True, "check", None, "check failed"), 99)[-1] == 99))(None)


(lambda _: kAssert((pAssert(3 > 0, "check", "valid", "check 'valid' failed"), 3)[-1] == 3))(None)


(lambda _: kAssert((x := 10, (pAssert(x > 0, "check", None, "check failed"), x + 5)[-1])[-1] == 15))(None)


(lambda _: kAssert((pAssert(1 > 0, "guard", None, "guard failed"), (x := 10, y := 20, x + y)[-1])[-1] == 30))(None)


(lambda _: kAssert((pAssert(True, "guard", None, "guard failed"), (pAssert(True, "guard", None, "guard failed"), 7)[-1])[-1] == 7))(None)


(lambda _: kAssert((pAssert(True, "guard", None, "guard failed"), (1) if (True) else (2))[-1] == 1))(None)

