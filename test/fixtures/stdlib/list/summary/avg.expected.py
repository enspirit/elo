(lambda _: kAssert((lambda a: None if not a else sum(a) / len(a))([1, 2, 3]) == 2))(None)
(lambda _: kAssert((lambda a: None if not a else sum(a) / len(a))([4, 8]) == 6))(None)
(lambda _: kAssert((lambda a: None if not a else sum(a) / len(a))([1.5, 2.5]) == 2))(None)
(lambda _: kAssert(((lambda a: None if not a else sum(a) / len(a))([]) is None)))(None)
