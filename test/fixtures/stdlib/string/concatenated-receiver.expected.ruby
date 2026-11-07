








->(_) { (raise "Assertion failed" unless ("ab" + "cd").start_with?("abc") == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").end_with?("bcd") == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").include?("bc") == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").index("c") == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").concat("e") == "abcde"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd")[1, 2] == "bc"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd")[1...3] == "bc"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").sub("c") { "Z" } == "abZd"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cdc").gsub("c") { "Z" } == "abZdZ"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless k_pad(("a" + "b"), 4, "0", true) == "00ab"; true) }.call(nil);
->(_) { def k_pad(s, n, p, at_start); raise "String length limit (10000000) exceeded; raise ELO_MAX_STRING_LENGTH to allow larger strings" if n > 10000000; at_start ? s.rjust(n, p) : s.ljust(n, p) end; (raise "Assertion failed" unless k_pad(("a" + "b"), 4, "0", false) == "ab00"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("a," + "b").split(",") == ["a", "b"]; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").reverse == "dcba"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("a" + "b").empty? == false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (" " + " ").strip.empty? == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").length == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ("ab" + "cd").upcase == "ABCD"; true) }.call(nil);
