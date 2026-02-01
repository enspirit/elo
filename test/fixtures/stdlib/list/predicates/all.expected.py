(lambda _: kAssert(all(map(lambda x: x > 0, [1, 2, 3])) == True))(None)
(lambda _: kAssert(all(map(lambda x: x > 2, [1, 2, 3])) == False))(None)
