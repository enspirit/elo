










(lambda _: kAssert(kEq((lambda s: (lambda _m: {"__proto__": _m.group(1)} if _m else {"__proto__": None})(re.search('x(.*?)y', s)))("xmatchy"), {"__proto__": "match"})))(None)
(lambda _: kAssert(kEq((lambda s: (lambda _m: {"__proto__": _m.group(1)} if _m else {"__proto__": None})(re.search('x(.*?)y', s)))("no match"), {"__proto__": None})))(None)
(lambda _: kAssert(kEq((lambda s: (lambda _m: {"name": _m.group(1), "__proto__": _m.group(2)} if _m else {"name": None, "__proto__": None})(re.search('From: (.*?) <(.*?)>', s)))("From: John <john@acme.com>").get("name"), "John")))(None)
