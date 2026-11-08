














(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2026-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2026-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 3)).toMillis() === DateTime.fromISO("2026-06-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * -1)).toMillis() === DateTime.fromISO("2026-02-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 1)).toMillis() === DateTime.fromISO("2026-04-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 0)).toMillis() === DateTime.fromISO("2026-03-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 1)).toMillis() === DateTime.fromISO("2026-02-28", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-12-31", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2027-02-28", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1Y").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2028-03-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M1D").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2026-05-03", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1Y1M").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2028-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1M").minus(Duration.fromISO("P10D"))).toMillis() === DateTime.fromISO("2026-02-18", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P2M").minus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2026-04-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").minus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2026-03-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M1D").minus(Duration.fromISO("P1D"))).toMillis() === DateTime.fromISO("2026-04-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1Y").minus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2027-02-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2026-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1D"))).toMillis() === DateTime.fromISO("2026-04-02", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-31T08:00:00Z", { zone: "utc" }).plus(Duration.fromISO("P1M").mapUnits(u => u * 2)).toMillis() === DateTime.fromISO("2026-07-31T08:00:00Z", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-15T08:00:00Z", { zone: "utc" }).plus(Duration.fromISO("P1M").minus(Duration.fromISO("P1D"))).toMillis() === DateTime.fromISO("2026-06-14T08:00:00Z", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
