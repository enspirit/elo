->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/a (.*)$/); _m ? {x: _m[1]} : {x: nil} }).call("a b")[:x] == "b"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/c (.*)$/); _m ? {y: _m[1]} : {y: nil} }).call("c d")[:y] == "d"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((->(s) { _m = s.match(/a (.*)$/); _m ? {x: _m[1]} : {x: nil} }).call("nomatch")[:x]).nil?; true) }.call(nil);
