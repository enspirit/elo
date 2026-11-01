











->(_) { (raise "Assertion failed" unless ["abc"].first.reverse == "cba"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[1, 2, 3]].first.reverse == [3, 2, 1]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [""].first.reverse == ""; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[]].first.reverse == []; true) }.call(nil);


->(_) { (raise "Assertion failed" unless "abc".reverse == "cba"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, 2, 3].reverse == [3, 2, 1]; true) }.call(nil);
