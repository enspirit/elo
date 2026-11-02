








(function(_) { return (function() { if (!(Math.pow(2, 10) == 1024)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, 1) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, 0) == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(9, 0.5) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);

(function(_) { return (function() { if (!(Math.pow(2, -1) == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, -2) == 0.25)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(4, -1) == 0.25)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(10, -3) == 0.001)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { function kTypeOf(v) { if (v === null || v === undefined) return 'Null'; if (Duration.isDuration(v)) return 'Duration'; if (DateTime.isDateTime(v)) return 'DateTime'; if (typeof v === 'number') return Number.isInteger(v) ? 'Int' : 'Float'; if (typeof v === 'boolean') return 'Bool'; if (typeof v === 'string') return 'String'; if (typeof v === 'function') return 'Function'; if (Array.isArray(v)) return 'List'; return 'Tuple'; } return (function() { if (!(kTypeOf(Math.pow(2, -1)) == "Float")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kTypeOf(v) { if (v === null || v === undefined) return 'Null'; if (Duration.isDuration(v)) return 'Duration'; if (DateTime.isDateTime(v)) return 'DateTime'; if (typeof v === 'number') return Number.isInteger(v) ? 'Int' : 'Float'; if (typeof v === 'boolean') return 'Bool'; if (typeof v === 'string') return 'String'; if (typeof v === 'function') return 'Function'; if (Array.isArray(v)) return 'List'; return 'Tuple'; } return (function() { if (!(kTypeOf(Math.pow(2, -2)) == "Float")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function kIsNull(v) { return v === null || v === undefined; } return (function() { if (!(kIsNull(Math.pow(2, -1)) == false)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(Math.pow(2, -1) + 0.5 == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.pow(2, -1) * 4 == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const e = -1; return Math.pow(2, e); })() == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);





