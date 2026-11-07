(lambda _: kAssert(kEq((lambda s: (lambda _m: {"x": _m.group(1)} if _m else {"x": None})(re.search('a (.*)$', s)))("a b").get("x"), "b")))(None)
(lambda _: kAssert(kEq((lambda s: (lambda _m: {"y": _m.group(1)} if _m else {"y": None})(re.search('c (.*)$', s)))("c d").get("y"), "d")))(None)
(lambda _: kAssert(((lambda s: (lambda _m: {"x": _m.group(1)} if _m else {"x": None})(re.search('a (.*)$', s)))("nomatch").get("x") is None)))(None)
