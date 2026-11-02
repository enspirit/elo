








->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, 10) == 1024; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, 1) == 2; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, 0) == 1; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(9, 0.5) == 3; true) }.call(nil);

->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, -1) == 0.5; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, -2) == 0.25; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(4, -1) == 0.25; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(10, -3) == 0.001; true) }.call(nil);


->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call(k_pow(2, -1)) == "Float"; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call(k_pow(2, -2)) == "Float"; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, -1)).nil? == false; true) }.call(nil);


->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, -1) + 0.5 == 1; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless k_pow(2, -1) * 4 == 2; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (e = -1; k_pow(2, e)) == 0.5; true) }.call(nil);






->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, -1)).round == 1; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, -2)).round == 0; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, -1)).floor == 0; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, -1)).ceil == 1; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, 10)).floor == 1024; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, 10)).round == 1024; true) }.call(nil);



->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, 3)).fdiv(2) == 4; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(2, 3)).fdiv(16) == 0.5; true) }.call(nil);
->(_) { def k_pow(l, r); v = l ** r; v.is_a?(Rational) ? v.to_f : v end; (raise "Assertion failed" unless (k_pow(5, 1)).fdiv(2) == 2.5; true) }.call(nil);
