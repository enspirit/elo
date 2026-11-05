->(_) { (raise "Assertion failed" unless "a,b,c".split(",") == ["a", "b", "c"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "hello world".split(" ") == ["hello", "world"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "one".split(",") == ["one"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "".split(",") == []; true) }.call(nil);


->(_) { (raise "Assertion failed" unless "abc".split("") == ["a", "b", "c"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "9".split("") == ["9"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "".split("") == []; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "BE68539007547034".split("").length == 16; true) }.call(nil);
