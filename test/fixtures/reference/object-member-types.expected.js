












(function(_) { return (function() { if (!(({a: 1}).a == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 1}).a != 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 1.5}).a == 1.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 1.0}).a == 1)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: true}).a == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: false}).a != true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: "x"}).a == "x")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: DateTime.fromISO("2024-01-15")}).a.toMillis() === DateTime.fromISO("2024-01-15").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: DateTime.fromISO("2024-01-15T10:30:00Z")}).a.toMillis() === DateTime.fromISO("2024-01-15T10:30:00Z").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(({a: 1}).a + 1 == 2)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 7}).a - 2 == 5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 3}).a * 3 == 9)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 10}).a / 4 == 2.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 1, b: 2}).a + ({a: 1, b: 2}).b == 3)) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(({a: "x", b: "y"}).a + ({a: "x", b: "y"}).b == "xy")) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(({a: 10}).a > 9)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 10}).a >= 10)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 10}).a < 11)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: 1, b: 2}).a < ({a: 1, b: 2}).b)) throw new Error("Assertion failed"); return true; })(); })(null);

(function(_) { return (function() { if (!(({a: "a", b: "b"}).a < ({a: "a", b: "b"}).b)) throw new Error("Assertion failed"); return true; })(); })(null);




(function(_) { return (function() { if (!(({a: "x"}).a.toUpperCase() == "X")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(({a: " x "}).a.trim() == "x")) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!((() => { const o = ({n: 10}); return o.n; })() == 10)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({n: 10}); return o.n + 5; })() == 15)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { function pFail(p, m, c, k, l) { return { success: false, path: p, message: m || '', value: null, cause: c || [], kind: k || 'schema', label: l }; } function pInt(v, p) { if (typeof v === 'number' && Number.isInteger(v)) return pOk(v, p); if (typeof v === 'string') { const n = parseInt(v, 10); if (!isNaN(n)) return pOk(n, p); } return pFail(p, 'expected Int, got ' + (v === null ? 'Null' : typeof v === 'string' ? JSON.stringify(v) : typeof v)); } function pOk(v, p) { return { success: true, path: p, message: '', value: v, cause: [] }; } function pUnwrap(r) { if (r.success) return r.value; function findError(e) { if (e.message) return e; if (e.cause && e.cause[0]) return findError(e.cause[0]); return e; } const err = findError(r); const e = new Error((err.path || '.') + ': ' + (err.message || 'type error')); e.kind = err.kind || 'schema'; e.path = err.path || '.'; if (err.label) e.label = err.label; throw e; } return (function() { if (!((() => { const o = ({x: "12"}); return pUnwrap(pInt((o.x ?? 0), '')); })() == 12)) throw new Error("Assertion failed"); return true; })(); })(null);






(function(_) { return (function() { if (!((() => { const o = ({n: 10}); const n = o.n; return n; })() == 10)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({n: 10}); const n = o.n; return n + 5; })() == 15)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({n: 10}); const n = o.n; const m = n; return m * 2; })() == 20)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({n: 10}); const n = o.n; const m = n; return m > 9; })() == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({f: 1.5}); const f = o.f; return f; })() == 1.5)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({b: true}); const b = o.b; return b; })() == true)) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({d: DateTime.fromISO("2024-01-15")}); const d = o.d; return d; })().toMillis() === DateTime.fromISO("2024-01-15").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);

(function(_) { return (function() { if (!((() => { const o = ({s: "x"}); const s = o.s; return s + "-a"; })() == "x-a")) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!((() => { const o = ({s: "a", t: "b"}); const s = o.s; const t = o.t; return s < t; })() == true)) throw new Error("Assertion failed"); return true; })(); })(null);
