














->(_) { (raise "Assertion failed" unless {__proto__: 1, a: 2}[:a] == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {a: 2, __proto__: 1}[:a] == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless !({__proto__: 1}).nil? == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless {x: {__proto__: 1, b: 3}}[:x][:b] == 3; true) }.call(nil);
