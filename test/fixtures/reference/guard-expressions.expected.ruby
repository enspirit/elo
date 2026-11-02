
->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless true; 42) == 42; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless 5 > 3; 100) == 100; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', "positive", "guard 'positive' failed") unless 10 > 0; 10) == 10; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', "value must be positive", "value must be positive") unless 7 > 0; 7) == 7; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless 10 > 0; p_raise('guard', nil, "guard failed") unless 10 < 100; 10) == 10; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', "positive", "guard 'positive' failed") unless 5 > 0; p_raise('guard', "small", "guard 'small' failed") unless 5 < 10; 5) == 5; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (x = 5; (p_raise('guard', nil, "guard failed") unless x > 0; x * 2)) == 10; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('check', nil, "check failed") unless true; 99) == 99; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('check', "valid", "check 'valid' failed") unless 3 > 0; 3) == 3; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (x = 10; (p_raise('check', nil, "check failed") unless x > 0; x + 5)) == 15; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless 1 > 0; (x = 10; y = 20; x + y)) == 30; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless true; (p_raise('guard', nil, "guard failed") unless true; 7)) == 7; true) }.call(nil);


->(_) { def p_err(m, k, pa, l); e = StandardError.new(m); e.define_singleton_method(:kind) { k }; e.define_singleton_method(:path) { pa }; e.define_singleton_method(:label) { l }; e end; def p_raise(k, l, m); raise p_err(m, k, nil, l) end; (raise "Assertion failed" unless (p_raise('guard', nil, "guard failed") unless true; (true) ? (1) : (2)) == 1; true) }.call(nil);

