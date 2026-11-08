->(_) { (raise "Assertion failed" unless 3.2.round == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.5.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.7.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.2.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.7.round == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 5.0.round == 5; true) }.call(nil);




->(_) { (raise "Assertion failed" unless 2.5.round == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -2.5.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.5.round == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 0.5.round == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -0.5.round == -1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 1.5.round == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -1.5.round == -2; true) }.call(nil);




->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; (raise "Assertion failed" unless ((k_pow(5, 1)).fdiv(2)).round == 3; true) }.call(nil);
->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; (raise "Assertion failed" unless ((k_pow(-5, 1)).fdiv(2)).round == -3; true) }.call(nil);
->(_) { def k_pow(l, r); raise "Exponentiation result exceeds the size limit (10000000 bits); raise ELO_MAX_STRING_LENGTH to allow larger results" if Integer === l && Integer === r && r > 1 && l.abs > 1 && r * Math.log2(l.abs) > 10000000; v = l ** r; Rational === v ? v.to_f : v end; (raise "Assertion failed" unless ((k_pow(7, 1)).fdiv(2)).round == 4; true) }.call(nil);
