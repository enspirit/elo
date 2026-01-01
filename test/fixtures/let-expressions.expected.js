(function(_) { return (function() { if (!((() => { const x = 12; return x; })() == 12)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 12; const y = 13; return x + y; })() == 25)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 5; const y = 3; return x + y; })() == 8)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 2; const y = 3; return x * y; })() == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const a = 10; const b = 20; return a + b; })() == 30)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const a = 5; const b = a * 2; return b; })() == 10)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 2; const y = x + 1; const z = y + 1; return z; })() == 4)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 1; return (() => { const x = 2; return x; })(); })() == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const x = 10; return x + (() => { const x = 5; return x; })(); })() == 15)) throw new Error("Assertion failed"); return true; })(); })(null);
