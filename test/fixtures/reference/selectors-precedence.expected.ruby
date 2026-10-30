





->(_) { (raise "Assertion failed" unless (10 - 8).to_f == 2; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless k_div((10 - 8).to_f, 4) == 0.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (2 + 3).to_f == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (2 * 3).to_f == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (7.5 - 0.5).to_i == 7; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (3.2 + 3.3).to_i == 6; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (1 + 2).to_s == "3"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (10 - 8).to_s == "2"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 3.to_f == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.7.to_i == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 42.to_s == "42"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { Float(s) rescue raise ".: expected Float, got #{s.inspect}" }).call("2.5") == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { Integer(s) rescue raise ".: expected Int, got #{s.inspect}" }).call("42") == 42; true) }.call(nil);
