














->(_) { (raise "Assertion failed" unless (1 == 1) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (1 == 2) == false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (1 != 2) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (1 == 1) != false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (1 == 2) != true; true) }.call(nil);

->(_) { (raise "Assertion failed" unless 1 < 2 == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 2 < 1 == false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 > 2 == false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 2 >= 2 == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 2 <= 1 == false; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 1 <= 2 == 3 > 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 > 2 == 3 < 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 >= 1 != 2 > 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1 < 2 != 2 < 1; true) }.call(nil);


->(_) { (raise "Assertion failed" unless ((1 == 1) == true) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("a" == "a") == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((nil).nil? == true) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (Date.parse("2024-01-15") == Date.parse("2024-01-15")) == true; true) }.call(nil);
