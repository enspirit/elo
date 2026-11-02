






->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(7, 2)) == 3.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(1, 4)) == 0.25; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(7.5, 2.5)) == 3; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(10, 4)) == 2.5; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(-7, 2)) == -3.5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 7.fdiv(2) == 3.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.fdiv(4) == 0.25; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 7.5 / 2.5 == 3; true) }.call(nil);
