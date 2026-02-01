(lambda _: kAssert(any(map(lambda x: x > 2, [1, 2, 3])) == True))(None)
(lambda _: kAssert(any(map(lambda x: x > 5, [1, 2, 3])) == False))(None)
