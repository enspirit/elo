











->(_) { (raise "Assertion failed" unless 7 % 3 == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 9 % 3 == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 0 % 5 == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 % 5 == 1; true) }.call(nil);


->(_) { (raise "Assertion failed" unless -7 % 3 == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -1 % 3 == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3 % 3 == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -9 % 5 == 1; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 7 % -3 == -2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 % -3 == -2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -7 % -3 == -1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -9 % -5 == -4; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 7.5 % 2 == 1.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -7.5 % 2 == 0.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 7.5 % -2 == -0.5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless -1 % 7 == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -8 % 7 == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (0 - 15) % 7 == 6; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 7 % 3 + 10 == 11; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -7 % 3 * 2 == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (n = -7; n % 3) == 2; true) }.call(nil);
