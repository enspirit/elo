
->(_) { (raise "Assertion failed" unless (raise "guard failed" unless true; 42) == 42; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard failed" unless 5 > 3; 100) == 100; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard 'positive' failed" unless 10 > 0; 10) == 10; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "value must be positive" unless 7 > 0; 7) == 7; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard failed" unless 10 > 0; raise "guard failed" unless 10 < 100; 10) == 10; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard 'positive' failed" unless 5 > 0; raise "guard 'small' failed" unless 5 < 10; 5) == 5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (x = 5; (raise "guard failed" unless x > 0; x * 2)) == 10; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "check failed" unless true; 99) == 99; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "check 'valid' failed" unless 3 > 0; 3) == 3; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (x = 10; (raise "check failed" unless x > 0; x + 5)) == 15; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard failed" unless 1 > 0; (x = 10; y = 20; x + y)) == 30; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard failed" unless true; (raise "guard failed" unless true; 7)) == 7; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (raise "guard failed" unless true; (true) ? (1) : (2)) == 1; true) }.call(nil);

