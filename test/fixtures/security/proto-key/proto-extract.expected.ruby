










->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/x(.*?)y/); _m ? {__proto__: _m[1]} : {__proto__: nil} }).call("xmatchy") == {__proto__: "match"}; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/x(.*?)y/); _m ? {__proto__: _m[1]} : {__proto__: nil} }).call("no match") == {__proto__: nil}; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { _m = s.match(/From: (.*?) <(.*?)>/); _m ? {name: _m[1], __proto__: _m[2]} : {name: nil, __proto__: nil} }).call("From: John <john@acme.com>")[:name] == "John"; true) }.call(nil);
