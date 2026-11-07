














(lambda _: kAssert({"__proto__": 1, "a": 2}.get("a") == 2))(None)
(lambda _: kAssert({"a": 2, "__proto__": 1}.get("a") == 2))(None)
(lambda _: kAssert(({"__proto__": 1} is not None) == True))(None)
(lambda _: kAssert({"x": {"__proto__": 1, "b": 3}}.get("x").get("b") == 3))(None)
