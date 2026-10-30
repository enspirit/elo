





->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(3.14159, 2) == 3.14; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(3.14159, 4) == 3.1416; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(2.5, 0) == 3; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(0.797381, 4) == 0.7974; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(271.6954, 2) == 271.7; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(103.125, 2) == 103.13; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(2.675, 2) == 2.68; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(k_div(1.0, 3), 3) == 0.333; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(123.456, 1) == 123.5; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(123.456, 0) == 123; true) }.call(nil);


->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(-3.14159, 2) == -3.14; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(-2.5, 0) == -3; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(-0.125, 2) == -0.13; true) }.call(nil);


->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(42, 2) == 42; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(7, 0) == 7; true) }.call(nil);
