











->(_) { (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call([1, "two", true, nil]) == "List"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, "two", true, nil].length == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, "two"], 0) == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([1, "two"], 1) == "two"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, "two"] == [1, "two"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, "two"].include?("two") == true; true) }.call(nil);


->(_) { (raise "Assertion failed" unless [[1], [2, 3]] == [[1], [2, 3]]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[1], [2, 3]].length == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(a, i) { i >= 0 && i < a.length ? a[i] : nil }).call([[1], [2, 3]], 1) == [2, 3]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[], [1, 2]] == [[], [1, 2]]; true) }.call(nil);


->(_) { (raise "Assertion failed" unless [1, 1.5] == [1, 1.5]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[1, 2], [3, 4]] == [[1, 2], [3, 4]]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, nil, 3] == [1, nil, 3]; true) }.call(nil);
