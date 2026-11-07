

















->(_) { (raise "Assertion failed" unless (i = 1; (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([10, 20, 30], i)) == 20; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (i = 2; (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call(["a", "b", "c"], i)) == "c"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (i = 1; (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([10, 20, 30], i + 1)) == 30; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (i = 99; ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([10, 20, 30], i)).nil?) == true; true) }.call(nil);



->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i) }; f.call([10, 20, 30], 2)) == 30; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i) }; f.call(["a", "b"], 0)) == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { ((->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i)).nil? }; f.call([10, 20], 99)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(i) { (->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call([10, 20, 30], i) }; f.call(1)) == 20; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(xs, i) { ((->(a, i) { a.is_a?(Array) && i.is_a?(Integer) && i >= 0 && i < a.length ? a[i] : nil }).call(xs, i)).nil? }; f.call([10, 20], -1)) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (i = -1; ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([10, 20], i)).nil?) == true; true) }.call(nil);
