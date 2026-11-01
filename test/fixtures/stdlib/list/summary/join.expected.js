(function(_) { return (function() { if (!(["a", "b", "c"].join(",") == "a,b,c")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(["hello", "world"].join(" ") == "hello world")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(["one"].join("-") == "one")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!([].join(",") == "")) throw new Error("Assertion failed"); return true; })(); })(null);
