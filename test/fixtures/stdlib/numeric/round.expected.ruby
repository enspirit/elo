->(_) { (raise "Assertion failed" unless 3.2.round == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.5.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.7.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.2.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.7.round == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 5.0.round == 5; true) }.call(nil);




->(_) { (raise "Assertion failed" unless 2.5.round == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -2.5.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.5.round == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 0.5.round == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -0.5.round == -1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.5.round == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -1.5.round == -2; true) }.call(nil);




->(_) { (raise "Assertion failed" unless ((5 ** 1).fdiv(2)).round == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((-5 ** 1).fdiv(2)).round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((7 ** 1).fdiv(2)).round == 4; true) }.call(nil);
