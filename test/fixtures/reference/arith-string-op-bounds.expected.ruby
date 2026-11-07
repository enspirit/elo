





->(_) { def k_mul(l, r); return k_str_mul(l, r) if l.is_a?(String) && r.is_a?(Integer); return k_str_mul(r, l) if r.is_a?(String) && l.is_a?(Integer); l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x) { k_mul(x, 3) }; f.call("ab")) == "ababab"; true) }.call(nil);
->(_) { def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless k_str_mul("ab", 3) == "ababab"; true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if l.is_a?(String) && r.is_a?(Integer); return k_str_mul(r, l) if r.is_a?(String) && l.is_a?(Integer); l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (begin; (->() { (f = ->(x) { k_mul(x, 6000000) }; f.call("ab")) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);
->(_) { def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (begin; (->() { k_str_mul("ab", 6000000) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);


->(_) { def k_mod(l, r); raise "Modulo requires numeric operands" unless l.is_a?(Numeric) && r.is_a?(Numeric); l % r end; (raise "Assertion failed" unless (f = ->(x, y) { k_mod(x, y) }; f.call(7, 3)) == 1; true) }.call(nil);
->(_) { def k_mod(l, r); raise "Modulo requires numeric operands" unless l.is_a?(Numeric) && r.is_a?(Numeric); l % r end; (raise "Assertion failed" unless (f = ->(x, y) { k_mod(x, y) }; f.call(-7, 3)) == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 7 % 3 == 1; true) }.call(nil);
->(_) { def k_mod(l, r); raise "Modulo requires numeric operands" unless l.is_a?(Numeric) && r.is_a?(Numeric); l % r end; (raise "Assertion failed" unless (begin; (->() { (f = ->(x) { k_mod(x, 1) }; f.call("%d")) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);


->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if l.is_a?(Integer) && r.is_a?(Integer) && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, 10) == 1024; true) }.call(nil);
->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if l.is_a?(Integer) && r.is_a?(Integer) && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (begin; (->() { k_pow(2, 20000000) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);
