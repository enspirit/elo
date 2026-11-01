(function(_) { return (function() { if (!([1, 2, 3].includes(2) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!([1, 2, 3].includes(4) == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!([].includes(1) == false)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(["a", "b", "c"].includes("b") == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(["a", "b", "c"].includes("d") == false)) throw new Error("Assertion failed"); return true; })(); })(null);
