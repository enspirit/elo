






->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x, y) { k_mul(12, k_add(x, y)) }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x, y) { k_mul(k_add(x, y), 12) }; f.call(1, 2)) == 36; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_sub(l, r); if (Date === l || Time === l) && (Date === r || Time === r); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(12, k_add(x, y)) }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(12, k_add(x, y)) }; f.call(1, 2)) == 4; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_mod(l, r); raise "Modulo requires numeric operands" unless Numeric === l && Numeric === r; l % r end; (raise "Assertion failed" unless (f = ->(x, y) { k_mod(12, k_add(x, y)) }; f.call(5, 2)) == 5; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; (raise "Assertion failed" unless (f = ->(x, y) { k_pow(k_add(x, y), 2) }; f.call(1, 2)) == 9; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x, y) { -(k_add(x, y)) }; f.call(40, 15)) == -55; true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; def k_sub(l, r); if (Date === l || Time === l) && (Date === r || Time === r); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_mul(2, k_sub(x, y)) }; f.call(5, 1)) == 8; true) }.call(nil);
->(_) { def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(100, k_mul(x, y)) }; f.call(2, 5)) == 10; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; def k_sub(l, r); if (Date === l || Time === l) && (Date === r || Time === r); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y, z) { k_sub(k_mul(x, k_add(y, z)), 1) }; f.call(2, 3, 4)) == 13; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x, y) { k_mul(k_add(x, 1), k_add(y, 1)) }; f.call(2, 3)) == 12; true) }.call(nil);
->(_) { def k_sub(l, r); if (Date === l || Time === l) && (Date === r || Time === r); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(1, k_sub(x, y)) }; f.call(5, 2)) == -2; true) }.call(nil);
->(_) { def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; (raise "Assertion failed" unless (f = ->(x, y) { k_div(24, k_div(x, y)) }; f.call(6, 2)) == 8; true) }.call(nil);


->(_) { (raise "Assertion failed" unless 12 * (1 + 2) == 36; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 12 - (1 + 2) == 9; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -(40 + 15) == -55; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 24.fdiv(6.fdiv(2)) == 8; true) }.call(nil);


->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x, y) { k_add(x, y) > 10 }; f.call(6, 5)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x > y == true }; f.call(2, 1)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { !(x > y) }; f.call(1, 2)) == true; true) }.call(nil);


->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x) { k_add(x, ((true) ? (10) : (20))) }; f.call(1)) == 11; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x) { k_add(x, ((false) ? (10) : (20))) }; f.call(1)) == 21; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x) { k_add(((false) ? (10) : (20)), x) }; f.call(1)) == 21; true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(x) { k_mul(x, ((false) ? (3) : (4))) }; f.call(2)) == 8; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(x) { -((false) ? (x) : (k_add(x, 1))) }; f.call(3)) == -4; true) }.call(nil);





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
