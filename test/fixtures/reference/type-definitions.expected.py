(lambda _: kAssert((_p_X := pString, X := lambda v: pUnwrap(_p_X(v, '')), X("hello"))[-1] == "hello"))(None)
(lambda _: kAssert((_p_X := pInt, X := lambda v: pUnwrap(_p_X(v, '')), X("42"))[-1] == 42))(None)
(lambda _: kAssert((_p_X := pAny, X := lambda v: pUnwrap(_p_X(v, '')), X("anything"))[-1] == "anything"))(None)
(lambda _: kAssert((_p_X := pAny, X := lambda v: pUnwrap(_p_X(v, '')), X(123))[-1] == 123))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice"}))[-1] == {"name": "Alice"}))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False), ("age", pInt, False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Bob", "age": "30"}))[-1] == {"name": "Bob", "age": 30}))(None)
(lambda _: kAssert((_p_Empty := pSchema([], "closed", None), Empty := lambda v: pUnwrap(_p_Empty(v, '')), Empty({}))[-1] == {}))(None)
(lambda _: kAssert((_p_PosInt := pSubtype(pInt, [("constraint failed", lambda i: i > 0)]), PosInt := lambda v: pUnwrap(_p_PosInt(v, '')), PosInt("42"))[-1] == 42))(None)
(lambda _: kAssert((_p_Ints := pArray(pInt), Ints := lambda v: pUnwrap(_p_Ints(v, '')), Ints(["1", "2", "3"]))[-1] == [1, 2, 3]))(None)
(lambda _: kAssert((_p_Strings := pArray(pString), Strings := lambda v: pUnwrap(_p_Strings(v, '')), Strings(["a", "b"]))[-1] == ["a", "b"]))(None)
(lambda _: kAssert((_p_People := pArray(pSchema([("name", pString, False)], "closed", None)), People := lambda v: pUnwrap(_p_People(v, '')), People([{"name": "Alice"}, {"name": "Bob"}]))[-1] == [{"name": "Alice"}, {"name": "Bob"}]))(None)
(lambda _: kAssert((_p_T := pUnion([pInt, pString]), T := lambda v: pUnwrap(_p_T(v, '')), T("42"))[-1] == 42))(None)
(lambda _: kAssert((_p_T := pUnion([pInt, pString]), T := lambda v: pUnwrap(_p_T(v, '')), T("hello"))[-1] == "hello"))(None)
(lambda _: kAssert((_p_T := pUnion([pString, pInt]), T := lambda v: pUnwrap(_p_T(v, '')), T("42"))[-1] == "42"))(None)
(lambda _: kAssert((_p_T := pUnion([pInt, pString, pBool]), T := lambda v: pUnwrap(_p_T(v, '')), T(True))[-1] == True))(None)
(lambda _: kAssert((_p_T := pArray(pUnion([pInt, pString])), T := lambda v: pUnwrap(_p_T(v, '')), T(["1", "hello", "3"]))[-1] == [1, "hello", 3]))(None)
(lambda _: kAssert((_p_Person := pSchema([("age", pSubtype(pInt, [("constraint failed", lambda i: i > 10)]), False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"age": 11}))[-1] == {"age": 11}))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False), ("nickname", pString, True)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice"}))[-1] == {"name": "Alice"}))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False), ("nickname", pString, True)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Bob", "nickname": "Bobby"}))[-1] == {"name": "Bob", "nickname": "Bobby"}))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False), ("age", pInt, True)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Eve", "age": "25"}))[-1] == {"name": "Eve", "age": 25}))(None)
(lambda _: kAssertFails(lambda : (_p_X := pInt, X := lambda v: pUnwrap(_p_X(v, '')), X("bad"))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("name", pString, False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person("not-an-object"))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("name", pString, False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person(None))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_PosInt := pSubtype(pInt, [("constraint failed", lambda i: i > 0)]), PosInt := lambda v: pUnwrap(_p_PosInt(v, '')), PosInt("-5"))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Ints := pArray(pInt), Ints := lambda v: pUnwrap(_p_Ints(v, '')), Ints(["1", "bad", "3"]))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_T := pUnion([pInt, pString]), T := lambda v: pUnwrap(_p_T(v, '')), T(True))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("age", pSubtype(pInt, [("constraint failed", lambda i: i > 10)]), False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"age": 10}))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("name", pString, False), ("age", pInt, True)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Eve", "age": "bad"}))[-1]))(None)


(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("name", pString, False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice", "extra": "bad"}))[-1]))(None)

(lambda _: kAssert((_p_Person := pSchema([("name", pString, False)], "ignored", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice", "extra": "ignored"}))[-1] == {"name": "Alice"}))(None)

(lambda _: kAssert((_p_Person := pSchema([("name", pString, False)], "typed", pInt), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice", "age": "30", "score": "100"}))[-1] == {"name": "Alice", "age": 30, "score": 100}))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("name", pString, False)], "typed", pInt), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"name": "Alice", "bad": "not-int"}))[-1]))(None)

(lambda _: kAssert((_p_Scores := pSchema([], "typed", pInt), Scores := lambda v: pUnwrap(_p_Scores(v, '')), Scores({"a": "1", "b": "2"}))[-1] == {"a": 1, "b": 2}))(None)

(lambda _: kAssert((_p_Open := pSchema([], "ignored", None), Open := lambda v: pUnwrap(_p_Open(v, '')), Open({"a": 1, "b": "two"}))[-1] == {}))(None)

(lambda _: kAssert((_p_A := pString, A := lambda v: pUnwrap(_p_A(v, '')), (_p_B := pInt, B := lambda v: pUnwrap(_p_B(v, '')), B("42"))[-1])[-1] == 42))(None)
(lambda _: kAssert((_p_A := pString, A := lambda v: pUnwrap(_p_A(v, '')), (_p_B := pInt, B := lambda v: pUnwrap(_p_B(v, '')), A("hello"))[-1])[-1] == "hello"))(None)
(lambda _: kAssert((_p_Person := pSchema([("name", pString, False), ("age", pSubtype(pInt, [("constraint failed", lambda i: i > 0)]), False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), (_p_Persons := pArray(_p_Person), Persons := lambda v: pUnwrap(_p_Persons(v, '')), Persons([{"name": "Bernard", "age": "18"}, {"name": "Louis", "age": "10"}]))[-1])[-1] == [{"name": "Bernard", "age": 18}, {"name": "Louis", "age": 10}]))(None)
(lambda _: kAssert((_p_Item := pSchema([("id", pInt, False)], "closed", None), Item := lambda v: pUnwrap(_p_Item(v, '')), (_p_Items := pArray(_p_Item), Items := lambda v: pUnwrap(_p_Items(v, '')), Items([{"id": "1"}, {"id": "2"}]))[-1])[-1] == [{"id": 1}, {"id": 2}]))(None)

(lambda _: kAssert((_p_T := pInt, T := lambda v: pUnwrap(_p_T(v, '')), (x := 5, x * 2)[-1])[-1] == 10))(None)
(lambda _: kAssert((_p_T := pInt, T := lambda v: pUnwrap(_p_T(v, '')), (x := 5, y := 3, x + y)[-1])[-1] == 8))(None)



(lambda _: kAssert((_p_Ints := pArray(pInt), Ints := lambda v: pUnwrap(_p_Ints(v, '')), Ints([]))[-1] == []))(None)

(lambda _: kAssert((_p_T := pFloat, T := lambda v: pUnwrap(_p_T(v, '')), T("3.14"))[-1] == 3.14))(None)
(lambda _: kAssert((_p_T := pFloat, T := lambda v: pUnwrap(_p_T(v, '')), T(42))[-1] == 42))(None)

(lambda _: kAssert((_p_Config := pSchema([("enabled", pBool, False)], "closed", None), Config := lambda v: pUnwrap(_p_Config(v, '')), Config({"enabled": "true"}))[-1] == {"enabled": True}))(None)
(lambda _: kAssert((_p_Config := pSchema([("enabled", pBool, False)], "closed", None), Config := lambda v: pUnwrap(_p_Config(v, '')), Config({"enabled": "false"}))[-1] == {"enabled": False}))(None)

(lambda _: kAssert((_p_Event := pSchema([("date", pDate, False)], "closed", None), Event := lambda v: pUnwrap(_p_Event(v, '')), Event({"date": "2024-01-15"}).get("date").year)[-1] == 2024))(None)
(lambda _: kAssertFails(lambda : (_p_T := pDate, T := lambda v: pUnwrap(_p_T(v, '')), T("bad"))[-1]))(None)

(lambda _: kAssert((_p_Event := pSchema([("date", pDatetime, False)], "closed", None), Event := lambda v: pUnwrap(_p_Event(v, '')), Event({"date": "2024-01-15T10:30:00"}).get("date").year)[-1] == 2024))(None)

(lambda _: kAssert((_p_T := pSchema([("a", pSchema([("b", pSchema([("c", pInt, False)], "closed", None), False)], "closed", None), False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"a": {"b": {"c": "42"}}}))[-1] == {"a": {"b": {"c": 42}}}))(None)

(lambda _: kAssert((_p_T := pSchema([("value", pUnion([pInt, pString]), True)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"value": "42"}))[-1] == {"value": 42}))(None)
(lambda _: kAssert((_p_T := pSchema([("value", pUnion([pInt, pString]), True)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"value": "hello"}))[-1] == {"value": "hello"}))(None)
(lambda _: kAssert((_p_T := pSchema([("value", pUnion([pInt, pString]), True)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({}))[-1] == {}))(None)

(lambda _: kAssert((_p_NonNeg := pSubtype(pInt, [("constraint failed", lambda i: i >= 0)]), NonNeg := lambda v: pUnwrap(_p_NonNeg(v, '')), NonNeg("0"))[-1] == 0))(None)

(lambda _: kAssert((_p_T := pSchema([("x1", pInt, False), ("x2", pInt, False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"x1": "1", "x2": "2"}))[-1] == {"x1": 1, "x2": 2}))(None)

(lambda _: kAssertFails(lambda : (_p_Ints := pArray(pInt), Ints := lambda v: pUnwrap(_p_Ints(v, '')), Ints([None]))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_Ints := pArray(pInt), Ints := lambda v: pUnwrap(_p_Ints(v, '')), Ints(["1", None, "3"]))[-1]))(None)

(lambda _: kAssertFails(lambda : (_p_T := pFloat, T := lambda v: pUnwrap(_p_T(v, '')), T("bad"))[-1]))(None)

(lambda _: kAssertFails(lambda : (_p_T := pBool, T := lambda v: pUnwrap(_p_T(v, '')), T("bad"))[-1]))(None)

(lambda _: kAssert((_p_T := pNull, T := lambda v: pUnwrap(_p_T(v, '')), T(None))[-1] == None))(None)
(lambda _: kAssertFails(lambda : (_p_T := pNull, T := lambda v: pUnwrap(_p_T(v, '')), T("not-null"))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_T := pNull, T := lambda v: pUnwrap(_p_T(v, '')), T(42))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_T := pNull, T := lambda v: pUnwrap(_p_T(v, '')), T(True))[-1]))(None)

(lambda _: kAssert((_p_T := pUnion([pInt, pNull]), T := lambda v: pUnwrap(_p_T(v, '')), T(None))[-1] == None))(None)
(lambda _: kAssert((_p_T := pUnion([pInt, pNull]), T := lambda v: pUnwrap(_p_T(v, '')), T(42))[-1] == 42))(None)
(lambda _: kAssert((_p_T := pUnion([pInt, pNull]), T := lambda v: pUnwrap(_p_T(v, '')), T("42"))[-1] == 42))(None)

(lambda _: kAssert((_p_T := pSchema([("value", pUnion([pInt, pNull]), False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"value": None}))[-1] == {"value": None}))(None)
(lambda _: kAssert((_p_T := pSchema([("value", pUnion([pInt, pNull]), False)], "closed", None), T := lambda v: pUnwrap(_p_T(v, '')), T({"value": 42}))[-1] == {"value": 42}))(None)


(lambda _: kAssert((_p_PosInt := pSubtype(pInt, [("constraint 'positive' failed", lambda i: i > 0)]), PosInt := lambda v: pUnwrap(_p_PosInt(v, '')), PosInt("42"))[-1] == 42))(None)
(lambda _: kAssertFails(lambda : (_p_PosInt := pSubtype(pInt, [("constraint 'positive' failed", lambda i: i > 0)]), PosInt := lambda v: pUnwrap(_p_PosInt(v, '')), PosInt("-5"))[-1]))(None)

(lambda _: kAssert((_p_PosInt := pSubtype(pInt, [("must be positive", lambda i: i > 0)]), PosInt := lambda v: pUnwrap(_p_PosInt(v, '')), PosInt("42"))[-1] == 42))(None)

(lambda _: kAssert((_p_PosEven := pSubtype(pInt, [("constraint 'positive' failed", lambda i: i > 0), ("constraint 'even' failed", lambda i: i % 2 == 0)]), PosEven := lambda v: pUnwrap(_p_PosEven(v, '')), PosEven("42"))[-1] == 42))(None)
(lambda _: kAssertFails(lambda : (_p_PosEven := pSubtype(pInt, [("constraint 'positive' failed", lambda i: i > 0), ("constraint 'even' failed", lambda i: i % 2 == 0)]), PosEven := lambda v: pUnwrap(_p_PosEven(v, '')), PosEven("41"))[-1]))(None)
(lambda _: kAssertFails(lambda : (_p_PosEven := pSubtype(pInt, [("constraint 'positive' failed", lambda i: i > 0), ("constraint 'even' failed", lambda i: i % 2 == 0)]), PosEven := lambda v: pUnwrap(_p_PosEven(v, '')), PosEven("-2"))[-1]))(None)

(lambda _: kAssert((_p_T := pSubtype(pInt, [("constraint failed", lambda i: i > 0), ("constraint 'even' failed", lambda i: i % 2 == 0)]), T := lambda v: pUnwrap(_p_T(v, '')), T("42"))[-1] == 42))(None)

(lambda _: kAssert((_p_Person := pSchema([("age", pSubtype(pInt, [("constraint 'adult' failed", lambda a: a >= 18)]), False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"age": 18}))[-1] == {"age": 18}))(None)
(lambda _: kAssertFails(lambda : (_p_Person := pSchema([("age", pSubtype(pInt, [("constraint 'adult' failed", lambda a: a >= 18)]), False)], "closed", None), Person := lambda v: pUnwrap(_p_Person(v, '')), Person({"age": 17}))[-1]))(None)
