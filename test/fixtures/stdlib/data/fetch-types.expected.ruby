







->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: "x"}, [:v]) == "x"; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: "x"}, [:v]) != "y"; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: 42}, [:v]) == 42; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: 42}, [:v]) != 43; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: 1.5}, [:v]) == 1.5; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: true}, [:v]) == true; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: false}, [:v]) == false; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: [1, 2]}, [:v]) == [1, 2]; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: {a: 1}}, [:v]) == {a: 1}; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({v: Date.parse("2024-01-15")}, [:v]) == Date.parse("2024-01-15"); true) }.call(nil);



->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({a: {b: 7}}, [:a, :b]) == 7; true) }.call(nil);
->(_) { def k_fetch(d, p); return nil unless p.is_a?(Array); p.reduce(d) { |cur, seg| break nil if cur.nil?; seg.is_a?(Integer) ? (cur.is_a?(Array) ? cur[seg] : nil) : (cur.is_a?(Hash) ? cur[seg.is_a?(String) ? seg.to_sym : seg] : nil) } end; (raise "Assertion failed" unless k_fetch({a: {b: {c: "deep"}}}, [:a, :b, :c]) == "deep"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless {v: 42}[:v] == 42; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"v\": 42}")[:v] == 42; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"v\": \"x\"}")[:v] == "x"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"v\": true}")[:v] == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"v\": 1.5}")[:v] == 1.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"a\": {\"b\": 7}}")[:a][:b] == 7; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { JSON.parse(s, symbolize_names: true) rescue raise ".: invalid JSON: #{s.inspect}" }).call("{\"a\": {\"b\": {\"c\": \"deep\"}}}")[:a][:b][:c] == "deep"; true) }.call(nil);
