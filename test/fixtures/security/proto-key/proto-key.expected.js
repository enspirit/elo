














(function(_) { function kMember(o, k) { if (o === null || typeof o !== 'object') return null; return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; } return (function() { if (!(kMember(({['__proto__']: 1, a: 2}), "a") == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMember(o, k) { if (o === null || typeof o !== 'object') return null; return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; } return (function() { if (!(kMember(({a: 2, ['__proto__']: 1}), "a") == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kIsNull(v) { return v === null || v === undefined; } return (function() { if (!(!kIsNull(({['__proto__']: 1})) == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kMember(o, k) { if (o === null || typeof o !== 'object') return null; return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; } return (function() { if (!(kMember(kMember(({x: ({['__proto__']: 1, b: 3})}), "x"), "b") == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
