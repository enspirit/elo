(function(_) { return (function() { if (!([1, 2, 3].some((x) => x > 2) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!([1, 2, 3].some((x) => x > 5) == false)) throw new Error("Assertion failed"); return true; })(); })(null);
