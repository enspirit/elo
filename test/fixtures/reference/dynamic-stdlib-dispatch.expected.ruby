
















->(_) { (raise "Assertion failed" unless (f = ->(s) { s.strip }; f.call("  a  ")) == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.lstrip }; f.call("  a")) == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.rstrip }; f.call("a  ")) == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.empty? }; f.call("")) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.strip.empty? }; f.call("  ")) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.concat("b") }; f.call("a")) == "ab"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.start_with?("ab") }; f.call("abc")) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.end_with?("bc") }; f.call("abc")) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.index("b") }; f.call("abc")) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.split(",") }; f.call("a,b")) == ["a", "b"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s[1, 2] }; f.call("abcd")) == "bc"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s[1...3] }; f.call("abcd")) == "bc"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.sub("a") { "z" } }; f.call("aba")) == "zba"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { s.gsub("a") { "z" } }; f.call("aba")) == "zbz"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s) { k_pad(s, 3, "0", true) }; f.call("7")) == "007"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s) { k_pad(s, 3, "0", false) }; f.call("7")) == "700"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { (->(s) { _m = s.match(/id=(.*)$/); _m ? {n: _m[1]} : {n: nil} }).call(s)[:n] }; f.call("id=42")) == "42"; true) }.call(nil);


->(_) { def k_mul(l, r); return k_str_mul(l, r) if l.is_a?(String) && r.is_a?(Integer); return k_str_mul(r, l) if r.is_a?(String) && l.is_a?(Integer); l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(xs) { xs.map(&->(x) { k_mul(x, 2) }) }; f.call([1, 2])) == [2, 4]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.select(&->(x) { x > 1 }) }; f.call([1, 2])) == [2]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.all?(&->(x) { x > 0 }) }; f.call([1, 2])) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.any?(&->(x) { x > 1 }) }; f.call([1, 2])) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.find(&->(x) { x > 1 }) }; f.call([1, 2])) == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.sort_by(&->(x) { -x }) }; f.call([1, 2])) == [2, 1]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.reduce(0, &->(a, x) { a + x }) }; f.call([1, 2])) == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs) { xs.join("-") }; f.call(["a", "b"])) == "a-b"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(b) { !b }; f.call(false)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(n) { +n }; f.call(3)) == 3; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless (f = ->(x) { k_round_to(x, 1) }; f.call(1.25)) == 1.3; true) }.call(nil);


->(_) { (raise "Assertion failed" unless "  a  ".strip == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "  ".strip.empty? == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "a".concat("b") == "ab"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "abc".index("b") == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "abcd"[1, 2] == "bc"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "aba".gsub("a") { "z" } == "zbz"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless k_pad("7", 3, "0", true) == "007"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/id=(.*)$/); _m ? {n: _m[1]} : {n: nil} }).call("id=42")[:n] == "42"; true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if l.is_a?(String) && r.is_a?(Integer); return k_str_mul(r, l) if r.is_a?(String) && l.is_a?(Integer); l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless [1, 2].map(&->(x) { k_mul(x, 2) }) == [2, 4]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, 2].reduce(0, &->(a, x) { a + x }) == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["a", "b"].join("-") == "a-b"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless !false == true; true) }.call(nil);
->(_) { def k_round_to(x, n); f = 10 ** n; (x * f).round.fdiv(f) end; (raise "Assertion failed" unless k_round_to(1.25, 1) == 1.3; true) }.call(nil);
