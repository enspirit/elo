->(_) { (raise "Assertion failed" unless ((true) ? (1) : (2)) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((5 > 3) ? ("yes") : ("no")) == "yes"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((1 > 2) ? ("a") : (((2 > 1) ? ("b") : ("c")))) == "b"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((10 > 5) ? (100 + 1) : (200 - 1)) == 101; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (x = 10; ((x > 5) ? ("big") : ("small"))) == "big"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((true) ? ((x = 1; x + 1)) : ((y = 2; y + 2))) == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((true && true) ? (1) : (0)) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((true) ? (true) : (false)); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((5 > 3) ? (10 == 10) : (false)); true) }.call(nil);




->(_) { (raise "Assertion failed" unless 1 + ((true) ? (10) : (20)) == 11; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 + ((false) ? (10) : (20)) == 21; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((true) ? (10) : (20)) + 1 == 11; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((false) ? (10) : (20)) + 1 == 21; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 2 * ((false) ? (3) : (4)) == 8; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((false) ? (3) : (4)) * 2 == 8; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 10 - ((false) ? (3) : (4)) == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 12.fdiv(((false) ? (3) : (4))) == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "a" + ((false) ? ("b") : ("c")) == "ac"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -((false) ? (3) : (4)) == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless !((false) ? (true) : (false)); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((false) ? (1) : (2)) == 2 && ((true) ? (1) : (2)) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((false) ? (1) : (2)) + ((true) ? (10) : (20)) == 12; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(((false) ? (1.26) : (2.34)), 1) == 2.3; true) }.call(nil);
