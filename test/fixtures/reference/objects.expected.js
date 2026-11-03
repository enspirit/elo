(function(_) { function kIsNull(v) { return v === null || v === undefined; } return (function() { if (!(kIsNull(({}).budget) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({budget: 1500}).budget == 1500)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({name: "Alice", age: 30}).name == "Alice")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({name: "Alice", age: 30}).age == 30)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const obj = ({x: 10}); return obj.x; })() == 10)) throw new Error("Assertion failed"); return true; })(); })(null);
