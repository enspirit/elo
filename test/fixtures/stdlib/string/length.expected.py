(lambda _: kAssert(len("hello") == 5))(None)
(lambda _: kAssert(len("") == 0))(None)
(lambda _: kAssert(len("abc def") == 7))(None)
(lambda _: kAssert(len("ab" + "cd") == 4))(None)
