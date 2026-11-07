




















->(_) { def k_patch(d, p, v); return v if p.empty?; seg = p[0]; rest = p[1..]; next_default = rest.empty? ? nil : (rest[0].is_a?(Integer) ? [] : {}); if seg.is_a?(Integer); raise 'cannot patch array index on non-array' if !d.nil? && !d.is_a?(Array); raise "Array length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays" if seg >= 10000000; arr = d.is_a?(Array) ? d.dup : []; arr[seg] = nil while arr.length <= seg; existing = arr[seg]; arr[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); arr; else; raise 'cannot patch object key on array' if d.is_a?(Array); obj = d.is_a?(Hash) ? d.dup : {}; existing = obj[seg]; obj[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); obj end; end; (raise "Assertion failed" unless k_patch([], [2], 7) == [nil, nil, 7]; true) }.call(nil);
->(_) { def k_patch(d, p, v); return v if p.empty?; seg = p[0]; rest = p[1..]; next_default = rest.empty? ? nil : (rest[0].is_a?(Integer) ? [] : {}); if seg.is_a?(Integer); raise 'cannot patch array index on non-array' if !d.nil? && !d.is_a?(Array); raise "Array length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays" if seg >= 10000000; arr = d.is_a?(Array) ? d.dup : []; arr[seg] = nil while arr.length <= seg; existing = arr[seg]; arr[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); arr; else; raise 'cannot patch object key on array' if d.is_a?(Array); obj = d.is_a?(Hash) ? d.dup : {}; existing = obj[seg]; obj[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); obj end; end; (raise "Assertion failed" unless (begin; (->() { k_patch([], [20000000], 1) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);
->(_) { def k_patch(d, p, v); return v if p.empty?; seg = p[0]; rest = p[1..]; next_default = rest.empty? ? nil : (rest[0].is_a?(Integer) ? [] : {}); if seg.is_a?(Integer); raise 'cannot patch array index on non-array' if !d.nil? && !d.is_a?(Array); raise "Array length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger arrays" if seg >= 10000000; arr = d.is_a?(Array) ? d.dup : []; arr[seg] = nil while arr.length <= seg; existing = arr[seg]; arr[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); arr; else; raise 'cannot patch object key on array' if d.is_a?(Array); obj = d.is_a?(Hash) ? d.dup : {}; existing = obj[seg]; obj[seg] = k_patch(existing.nil? ? next_default : existing, rest, v); obj end; end; (raise "Assertion failed" unless (begin; (->() { k_patch({a: []}, [:a, 20000000], 1) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end); true) }.call(nil);



->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s, n) { k_pad(s, n, "-", true) }; f.call("x", 3)) == "--x"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s, n) { k_pad(s, n, "-", false) }; f.call("x", 3)) == "x--"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s, n) { k_pad(s, n, "-", true) }; (begin; (->() { f.call("x", 10000001) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end)); true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless (f = ->(s, n) { k_pad(s, n, "-", false) }; (begin; (->() { f.call("x", 10000001) }).call; raise "Expected error but none thrown"; rescue => e; raise e if e.message == "Expected error but none thrown"; true; end)); true) }.call(nil);



->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i) }; (f.call([1, 2], "x")).nil?) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i) }; (f.call("notalist", 0)).nil?) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i) }; f.call([1, 2], 1)) == 2; true) }.call(nil);
