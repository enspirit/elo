











(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-04-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P2M")).toMillis() === DateTime.fromISO("2026-05-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P3M")).toMillis() === DateTime.fromISO("2026-06-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-04-01").minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-03-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31").plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-02-28").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-31").minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-02-28").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-31").plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-30").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31").plus(Duration.fromISO("P1M")).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-03-28").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31").plus(Duration.fromISO("P1Y")).toMillis() === DateTime.fromISO("2027-01-31").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P1M1D")).toMillis() === DateTime.fromISO("2026-04-02").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31").plus(Duration.fromISO("P1M1D")).toMillis() === DateTime.fromISO("2026-03-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P1Y1M1D")).toMillis() === DateTime.fromISO("2027-04-02").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2026-05-01").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01").plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1D"))).toMillis() === DateTime.fromISO("2026-04-02").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-15T08:00:00Z").plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-15T08:00:00Z").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-06-30T08:00:00Z").minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-05-30T08:00:00Z").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-31T08:00:00Z").plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-30T08:00:00Z").toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
