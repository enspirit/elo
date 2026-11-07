






->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 * (x + y) }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { (x + y) * 12 }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(12, x + y) }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(12, x + y) }; f.call(1, 2)) == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { 12 % (x + y) }; f.call(5, 2)) == 5; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (f = ->(x, y) { k_pow(x + y, 2) }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { -(x + y) }; f.call(40, 15)) == -55; true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { 2 * (k_sub(x, y)) }; f.call(5, 1)) == 8; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(100, x * y) }; f.call(2, 5)) == 10; true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y, z) { k_sub(x * (y + z), 1) }; f.call(2, 3, 4)) == 13; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { (x + 1) * (y + 1) }; f.call(2, 3)) == 12; true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(1, k_sub(x, y)) }; f.call(5, 2)) == -2; true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(24, k_div(x, y)) }; f.call(6, 2)) == 8; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 12 * (1 + 2) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 12 - (1 + 2) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -(40 + 15) == -55; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 24.fdiv(6.fdiv(2)) == 8; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x + y > 10 }; f.call(6, 5)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x > y == true }; f.call(2, 1)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { !(x > y) }; f.call(1, 2)) == true; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x) { x + ((true) ? (10) : (20)) }; f.call(1)) == 11; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x + ((false) ? (10) : (20)) }; f.call(1)) == 21; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { ((false) ? (10) : (20)) + x }; f.call(1)) == 21; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x * ((false) ? (3) : (4)) }; f.call(2)) == 8; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { -((false) ? (x) : (x + 1)) }; f.call(3)) == -4; true) }.call(nil);





->(_) { (raise "Assertion failed" unless (a = "ab"; ["abc"].map(&->(x) { (a + "cd").start_with?(x) })) == [true]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["bcd"].map(&->(x) { (a + "cd").end_with?(x) })) == [true]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["bc"].map(&->(x) { (a + "cd").include?(x) })) == [true]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["z"].map(&->(x) { (a + "cd").include?(x) })) == [false]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["c"].map(&->(x) { (a + "cd").index(x) })) == [2]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["e"].map(&->(x) { (a + "cd").concat(x) })) == ["abcde"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; [1].map(&->(x) { (a + "cd")[x, 2] })) == ["bc"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; [1].map(&->(x) { (a + "cd")[x...3] })) == ["bc"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["c"].map(&->(x) { (a + "cd").sub(x) { "Z" } })) == ["abZd"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; ["c"].map(&->(x) { (a + "cdc").gsub(x) { "Z" } })) == ["abZdZ"]; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (a = "ab"; ["0"].map(&->(x) { k_pad((a + "cd"), 6, x, true) })) == ["00abcd"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = "ab"; [","].map(&->(x) { (a + ",cd").split(x) })) == [["ab", "cd"]]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = [1]; [2].map(&->(x) { (a + [3]).include?(x) })) == [false]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (a = [1]; [3].map(&->(x) { (a + [3]).include?(x) })) == [true]; true) }.call(nil);
