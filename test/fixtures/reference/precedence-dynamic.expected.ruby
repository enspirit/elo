






->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 * (x + y) }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { (x + y) * 12 }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 - (x + y) }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 / (x + y) }; f.call(1, 2)) == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 % (x + y) }; f.call(5, 2)) == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { (x + y) ** 2 }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { -(x + y) }; f.call(40, 15)) == -55; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 2 * (x - y) }; f.call(5, 1)) == 8; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 100 / (x * y) }; f.call(2, 5)) == 10; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y, z) { x * (y + z) - 1 }; f.call(2, 3, 4)) == 13; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { (x + 1) * (y + 1) }; f.call(2, 3)) == 12; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 1 - (x - y) }; f.call(5, 2)) == -2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 24 / (x / y) }; f.call(6, 2)) == 8; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 12 * (1 + 2) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 12 - (1 + 2) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -(40 + 15) == -55; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 24 / (6 / 2) == 8; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x + y > 10 }; f.call(6, 5)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x > y == true }; f.call(2, 1)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { !(x > y) }; f.call(1, 2)) == true; true) }.call(nil);
