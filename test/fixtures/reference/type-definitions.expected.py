(lambda _: kAssert(X("hello") == "hello"))(None)
(lambda _: kAssert(X("42") == 42))(None)
(lambda _: kAssert(X("anything") == "anything"))(None)
(lambda _: kAssert(X(123) == 123))(None)
(lambda _: kAssert(Person({"name": "Alice"}) == {"name": "Alice"}))(None)
(lambda _: kAssert(Person({"name": "Bob", "age": "30"}) == {"name": "Bob", "age": 30}))(None)
(lambda _: kAssert(Empty({}) == {}))(None)
(lambda _: kAssert(PosInt("42") == 42))(None)
(lambda _: kAssert(Ints(["1", "2", "3"]) == [1, 2, 3]))(None)
(lambda _: kAssert(Strings(["a", "b"]) == ["a", "b"]))(None)
(lambda _: kAssert(People([{"name": "Alice"}, {"name": "Bob"}]) == [{"name": "Alice"}, {"name": "Bob"}]))(None)
(lambda _: kAssert(T("42") == 42))(None)
(lambda _: kAssert(T("hello") == "hello"))(None)
(lambda _: kAssert(T("42") == "42"))(None)
(lambda _: kAssert(T(True) == True))(None)
(lambda _: kAssert(T(["1", "hello", "3"]) == [1, "hello", 3]))(None)
(lambda _: kAssert(Person({"age": 11}) == {"age": 11}))(None)
(lambda _: kAssert(Person({"name": "Alice"}) == {"name": "Alice"}))(None)
(lambda _: kAssert(Person({"name": "Bob", "nickname": "Bobby"}) == {"name": "Bob", "nickname": "Bobby"}))(None)
(lambda _: kAssert(Person({"name": "Eve", "age": "25"}) == {"name": "Eve", "age": 25}))(None)
(lambda _: kAssertFails(lambda : X("bad")))(None)
(lambda _: kAssertFails(lambda : Person("not-an-object")))(None)
(lambda _: kAssertFails(lambda : Person(None)))(None)
(lambda _: kAssertFails(lambda : PosInt("-5")))(None)
(lambda _: kAssertFails(lambda : Ints(["1", "bad", "3"])))(None)
(lambda _: kAssertFails(lambda : T(True)))(None)
(lambda _: kAssertFails(lambda : Person({"age": 10})))(None)
(lambda _: kAssertFails(lambda : Person({"name": "Eve", "age": "bad"})))(None)


(lambda _: kAssertFails(lambda : Person({"name": "Alice", "extra": "bad"})))(None)

(lambda _: kAssert(Person({"name": "Alice", "extra": "ignored"}) == {"name": "Alice"}))(None)

(lambda _: kAssert(Person({"name": "Alice", "age": "30", "score": "100"}) == {"name": "Alice", "age": 30, "score": 100}))(None)
(lambda _: kAssertFails(lambda : Person({"name": "Alice", "bad": "not-int"})))(None)

(lambda _: kAssert(Scores({"a": "1", "b": "2"}) == {"a": 1, "b": 2}))(None)

(lambda _: kAssert(Open({"a": 1, "b": "two"}) == {}))(None)

(lambda _: kAssert(B("42") == 42))(None)
(lambda _: kAssert(A("hello") == "hello"))(None)
(lambda _: kAssert(Persons([{"name": "Bernard", "age": "18"}, {"name": "Louis", "age": "10"}]) == [{"name": "Bernard", "age": 18}, {"name": "Louis", "age": 10}]))(None)
(lambda _: kAssert(Items([{"id": "1"}, {"id": "2"}]) == [{"id": 1}, {"id": 2}]))(None)

(lambda _: kAssert((x := 5, x * 2)[-1] == 10))(None)
(lambda _: kAssert((x := 5, y := 3, x + y)[-1] == 8))(None)



(lambda _: kAssert(Ints([]) == []))(None)

(lambda _: kAssert(T("3.14") == 3.14))(None)
(lambda _: kAssert(T(42) == 42))(None)

(lambda _: kAssert(Config({"enabled": "true"}) == {"enabled": True}))(None)
(lambda _: kAssert(Config({"enabled": "false"}) == {"enabled": False}))(None)

(lambda _: kAssert(Event({"date": "2024-01-15T10:30:00"}).get("date").year == 2024))(None)

(lambda _: kAssert(T({"a": {"b": {"c": "42"}}}) == {"a": {"b": {"c": 42}}}))(None)

(lambda _: kAssert(T({"value": "42"}) == {"value": 42}))(None)
(lambda _: kAssert(T({"value": "hello"}) == {"value": "hello"}))(None)
(lambda _: kAssert(T({}) == {}))(None)

(lambda _: kAssert(NonNeg("0") == 0))(None)

(lambda _: kAssert(T({"x1": "1", "x2": "2"}) == {"x1": 1, "x2": 2}))(None)

(lambda _: kAssertFails(lambda : Ints([None])))(None)
(lambda _: kAssertFails(lambda : Ints(["1", None, "3"])))(None)

(lambda _: kAssertFails(lambda : T("bad")))(None)

(lambda _: kAssertFails(lambda : T("bad")))(None)

(lambda _: kAssert(T(None) == None))(None)
(lambda _: kAssertFails(lambda : T("not-null")))(None)
(lambda _: kAssertFails(lambda : T(42)))(None)
(lambda _: kAssertFails(lambda : T(True)))(None)

(lambda _: kAssert(T(None) == None))(None)
(lambda _: kAssert(T(42) == 42))(None)
(lambda _: kAssert(T("42") == 42))(None)

(lambda _: kAssert(T({"value": None}) == {"value": None}))(None)
(lambda _: kAssert(T({"value": 42}) == {"value": 42}))(None)


(lambda _: kAssert(PosInt("42") == 42))(None)
(lambda _: kAssertFails(lambda : PosInt("-5")))(None)

(lambda _: kAssert(PosInt("42") == 42))(None)

(lambda _: kAssert(PosEven("42") == 42))(None)
(lambda _: kAssertFails(lambda : PosEven("41")))(None)
(lambda _: kAssertFails(lambda : PosEven("-2")))(None)

(lambda _: kAssert(T("42") == 42))(None)

(lambda _: kAssert(Person({"age": 18}) == {"age": 18}))(None)
(lambda _: kAssertFails(lambda : Person({"age": 17})))(None)
