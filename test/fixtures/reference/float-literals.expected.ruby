









->(_) { (raise "Assertion failed" unless 7.0 / 2 == 3.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.0 / 4 == 0.25; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 10.0 / 4 == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.0 / 2 * 2 == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 5.0 / 2 == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.0 / 3 > 0.33; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (n = 2; 5.0 / n) == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { 9.0 / x }; f.call(2)) == 4.5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 1.0 == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 2.0 + 1 == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -0.0 == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 42.0 == 42; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 2.0.round == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.0.abs == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [2.0, 1].min == 1; true) }.call(nil);
