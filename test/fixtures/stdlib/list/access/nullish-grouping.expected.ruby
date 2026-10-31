







->(_) { (raise "Assertion failed" unless [[1, 2], [3]].first.length == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([[1, 2], [3]], 0).length == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([[1, 2], [3]], 1).length == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["ab", "c"].first.length == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call(["ab", "c"], 1).length == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[1], [2, 3]].last.length == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[1, 2], [3]].first.sum == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[7, 8]].first.first == 7; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["ab"].first.upcase == "AB"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless ([].first).nil?; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([], 0)).nil?; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2], 9)).nil?; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [5].first == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([5, 6], 1) == 6; true) }.call(nil);
