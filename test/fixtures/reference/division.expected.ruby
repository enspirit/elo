





->(_) { (raise "Assertion failed" unless 7.fdiv(2) == 3.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.fdiv(4) == 0.25; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 10.fdiv(4) == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.fdiv(3) > 0.33; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.fdiv(2) * 2 == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 100.fdiv(8) == 12.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -7.fdiv(2) == -3.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 0.fdiv(5) == 0; true) }.call(nil);


->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless k_div(7.0, 2) == 3.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless k_div(7, 2.0) == 3.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless k_div(7.5, 2.5) == 3; true) }.call(nil);


->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(7, 2)) == 3.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(1, 4)) == 0.25; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(7.5, 2.5)) == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (n = 2; 7.fdiv(n)) == 3.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = 10; b = 4; a.fdiv(b)) == 2.5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (1 + 1).fdiv(4) == 0.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless k_div(24, 6.fdiv(2)) == 8; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (7.fdiv(2)).round == 4; true) }.call(nil);
