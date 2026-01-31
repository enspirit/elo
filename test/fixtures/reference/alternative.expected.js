(function(_) { return (function() { if (!((42 ?? 0) == 42)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(("hello" ?? "default") == "hello")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((((i => i === -1 ? null : i)("hello".indexOf("l"))) ?? (-1)) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((((i => i === -1 ? null : i)("hello".indexOf("x"))) ?? (-1)) == -1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((((i => i === -1 ? null : i)("hello".indexOf("x"))) ?? ((i => i === -1 ? null : i)("hello".indexOf("z"))) ?? (-1)) == -1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((((i => i === -1 ? null : i)("hello".indexOf("x"))) ?? ((i => i === -1 ? null : i)("hello".indexOf("l"))) ?? (-1)) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 42; return (x ?? 0); })() == 42)) throw new Error("Assertion failed"); return true; })(); })(null);
