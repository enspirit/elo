










->(_) { (raise "Assertion failed" unless [1, 2, 3].first == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, 2, 3].last == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2, 3], 0) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2, 3], 1) == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2, 3], 2) == 3; true) }.call(nil);

->(_) { (raise "Assertion failed" unless [1.5, 2.5].first == 1.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1.5, 2.5].last == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["a", "b"].first == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call(["a", "b"], 1) == "b"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["a", "b"].last == "b"; true) }.call(nil);


->(_) { (raise "Assertion failed" unless [1, 2, 3].reverse.first == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, 2, 3].reverse.last == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([3, 1, 2].sort, 0) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([3, 1, 2].sort, 2) == 3; true) }.call(nil);


->(_) { (raise "Assertion failed" unless ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2, 3], 100)).nil? == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, 2, 3], -1)).nil? == true; true) }.call(nil);
