





(function(_) { return (function() { if (!((10 - 8) == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((10 - 8) / 4 == 0.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((2 + 3) == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((2 * 3) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.trunc(7.5 - 0.5) == 7)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.trunc(3.2 + 3.3) == 6)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(String(1 + 2) == "3")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(String(10 - 8) == "2")) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(3 == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(Math.trunc(3.7) == 3)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(String(42) == "42")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function pFail(p, m, c, k, l) { return { success: false, path: p, message: m || '', value: null, cause: c || [], kind: k || 'schema', label: l }; } function pFloat(v, p) { if (typeof v === 'number') return pOk(v, p); if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) return pOk(n, p); } return pFail(p, 'expected Float, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v)); } function pOk(v, p) { return { success: true, path: p, message: '', value: v, cause: [] }; } function pUnwrap(r) { if (r.success) return r.value; function findError(e) { if (e.message) return e; if (e.cause && e.cause[0]) return findError(e.cause[0]); return e; } const err = findError(r); const e = new Error((err.path || '.') + ': ' + (err.message || 'type error')); e.kind = err.kind || 'schema'; e.path = err.path || '.'; if (err.label) e.label = err.label; throw e; } return (function() { if (!(pUnwrap(pFloat("2.5", '')) == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function pFail(p, m, c, k, l) { return { success: false, path: p, message: m || '', value: null, cause: c || [], kind: k || 'schema', label: l }; } function pInt(v, p) { if (typeof v === 'number' && Number.isInteger(v)) return pOk(v, p); if (typeof v === 'string') { const n = parseInt(v, 10); if (!isNaN(n)) return pOk(n, p); } return pFail(p, 'expected Int, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v)); } function pOk(v, p) { return { success: true, path: p, message: '', value: v, cause: [] }; } function pUnwrap(r) { if (r.success) return r.value; function findError(e) { if (e.message) return e; if (e.cause && e.cause[0]) return findError(e.cause[0]); return e; } const err = findError(r); const e = new Error((err.path || '.') + ': ' + (err.message || 'type error')); e.kind = err.kind || 'schema'; e.path = err.path || '.'; if (err.label) e.label = err.label; throw e; } return (function() { if (!(pUnwrap(pInt("42", '')) == 42)) throw new Error("Assertion failed"); return true; })(); })(null);
