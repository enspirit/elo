












->(_) { (raise "Assertion failed" unless {a: 1}[:a] == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1}[:a] != 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1.5}[:a] == 1.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1.0}[:a] == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: true}[:a] == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: false}[:a] != true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: "x"}[:a] == "x"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: Date.parse("2024-01-15")}[:a] == Date.parse("2024-01-15"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: DateTime.parse("2024-01-15T10:30:00Z")}[:a] == DateTime.parse("2024-01-15T10:30:00Z"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless {a: 1}[:a] + 1 == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 7}[:a] - 2 == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 3}[:a] * 3 == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 10}[:a].fdiv(4) == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1, b: 2}[:a] + {a: 1, b: 2}[:b] == 3; true) }.call(nil);


->(_) { (raise "Assertion failed" unless {a: "x", b: "y"}[:a] + {a: "x", b: "y"}[:b] == "xy"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless {a: 10}[:a] > 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 10}[:a] >= 10; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 10}[:a] < 11; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1, b: 2}[:a] < {a: 1, b: 2}[:b]; true) }.call(nil);

->(_) { (raise "Assertion failed" unless {a: "a", b: "b"}[:a] < {a: "a", b: "b"}[:b]; true) }.call(nil);




->(_) { (raise "Assertion failed" unless {a: "x"}[:a].upcase == "X"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: " x "}[:a].strip == "x"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (o = {n: 10}; o[:n]) == 10; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (o = {n: 10}; o[:n] + 5) == 15; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (o = {x: "12"}; (->(s) { Integer(s) rescue raise ".: expected Int, got #{s.inspect}" }).call(->() { v = o[:x]; return v unless v.nil?; 0 }.call)) == 12; true) }.call(nil);
