->(_) { (raise "Assertion failed" unless [1, 2, 3] == [1, 2, 3]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1] == [1]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1, b: 2}[:a] == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 1}[:a] == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (x = 2; y = 3; x * y) == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (x = 2; x * 2) == 4; true) }.call(nil);

