






->(_) { (raise "Assertion failed" unless "ab".upcase == "AB"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "AB".downcase == "ab"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "abc".length == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless "  a  ".strip == "a"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("a" + "b").upcase == "AB"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "c").length == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["ab"].first.upcase == "AB"; true) }.call(nil);
