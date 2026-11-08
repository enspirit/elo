



















->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call([1, 2], [3, 4])) == [1, 2, 3, 4]; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(["a"], ["b", "c"])) == ["a", "b", "c"]; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call([], [1])) == [1]; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call([1, 2], [3, 4])).length == 4; true) }.call(nil);


->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call("ab", "cd")) == "abcd"; true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(1, 2)) == 3; true) }.call(nil);


->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(ActiveSupport::Duration.parse("P1D"), Date.parse("2024-01-15"))) == Date.parse("2024-01-16"); true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(ActiveSupport::Duration.parse("PT1H"), DateTime.parse("2024-01-15T10:00:00Z"))) == DateTime.parse("2024-01-15T11:00:00Z"); true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(Date.parse("2024-01-15"), ActiveSupport::Duration.parse("P1D"))) == Date.parse("2024-01-16"); true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless (f = ->(a, b) { k_add(a, b) }; f.call(ActiveSupport::Duration.parse("P1D"), ActiveSupport::Duration.parse("P2D"))) == ActiveSupport::Duration.parse("P3D"); true) }.call(nil);


->(_) { def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call((f = ->(a, b) { k_div(a, b) }; f.call(ActiveSupport::Duration.parse("P2D"), 2))) == "Duration"; true) }.call(nil);
->(_) { def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(ActiveSupport::Duration.parse("P2D"), 2)) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call((f = ->(a, b) { k_mul(a, b) }; f.call(ActiveSupport::Duration.parse("P1D"), 2))) == "Duration"; true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (f = ->(a, b) { k_mul(a, b) }; f.call(ActiveSupport::Duration.parse("P1D"), 2)) == ActiveSupport::Duration.parse("P2D"); true) }.call(nil);
->(_) { def k_div(l, r); return l / r if ActiveSupport::Duration === l; return l.fdiv(r) if Integer === l && Integer === r; l / r end; (raise "Assertion failed" unless (f = ->(a, b) { k_div(a, b) }; f.call(5, 2)) == 2.5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(i) { (->(v) { case v when ActiveSupport::Duration; v when Range; ActiveSupport::Duration.build(((v.last - v.first) * 86400).to_i) when String; ActiveSupport::Duration.parse(v) rescue raise ".: expected Duration (ISO 8601), got #{v.inspect}" else raise ".: expected Duration, got #{v.class}" end }).call(i) }; f.call((DateTime.parse("2024-01-01T10:00:00Z")..DateTime.parse("2024-01-01T12:00:00Z")))) == ActiveSupport::Duration.parse("PT2H"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(i) { (->(v) { case v when ActiveSupport::Duration; v when Range; ActiveSupport::Duration.build(((v.last - v.first) * 86400).to_i) when String; ActiveSupport::Duration.parse(v) rescue raise ".: expected Duration (ISO 8601), got #{v.inspect}" else raise ".: expected Duration, got #{v.class}" end }).call(i) }; f.call((DateTime.parse("2024-01-01T00:00:00Z")..DateTime.parse("2024-01-02T00:00:00Z")))) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(d) { (->(v) { case v when ActiveSupport::Duration; v when Range; ActiveSupport::Duration.build(((v.last - v.first) * 86400).to_i) when String; ActiveSupport::Duration.parse(v) rescue raise ".: expected Duration (ISO 8601), got #{v.inspect}" else raise ".: expected Duration, got #{v.class}" end }).call(d) }; f.call(ActiveSupport::Duration.parse("P1D"))) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(s) { (->(v) { case v when ActiveSupport::Duration; v when Range; ActiveSupport::Duration.build(((v.last - v.first) * 86400).to_i) when String; ActiveSupport::Duration.parse(v) rescue raise ".: expected Duration (ISO 8601), got #{v.inspect}" else raise ".: expected Duration, got #{v.class}" end }).call(s) }; f.call("PT2H")) == ActiveSupport::Duration.parse("PT2H"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless [1, 2] + [3, 4] == [1, 2, 3, 4]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["a"] + ["b", "c"] == ["a", "b", "c"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "ab" + "cd" == "abcd"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-01-15") + ActiveSupport::Duration.parse("P1D") == Date.parse("2024-01-16"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2024-01-15T10:00:00Z") + ActiveSupport::Duration.parse("PT1H") == DateTime.parse("2024-01-15T11:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-01-15") + ActiveSupport::Duration.parse("P1D") == Date.parse("2024-01-16"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("P1D") + ActiveSupport::Duration.parse("P2D") == ActiveSupport::Duration.parse("P3D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call(ActiveSupport::Duration.parse("P2D") / 2) == "Duration"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("P2D") / 2 == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { def k_mul(l, r); return k_str_mul(l, r) if String === l && Integer === r; return k_str_mul(r, l) if String === r && Integer === l; l * r end; def k_str_mul(s, n); return '' if n <= 0; raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if s.length * n > 10000000; s * n end; (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call(k_mul(ActiveSupport::Duration.parse("P1D"), 2)) == "Duration"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 5.fdiv(2) == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.build((((DateTime.parse("2024-01-01T10:00:00Z")..DateTime.parse("2024-01-01T12:00:00Z")).last - (DateTime.parse("2024-01-01T10:00:00Z")..DateTime.parse("2024-01-01T12:00:00Z")).first) * 86400).to_i) == ActiveSupport::Duration.parse("PT2H"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("P1D") == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { ActiveSupport::Duration.parse(s) rescue raise ".: expected Duration (ISO 8601), got #{s.inspect}" }).call("PT2H") == ActiveSupport::Duration.parse("PT2H"); true) }.call(nil);
