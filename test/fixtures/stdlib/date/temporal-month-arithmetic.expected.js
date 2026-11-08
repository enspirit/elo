











(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-04-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P2M")).toMillis() === DateTime.fromISO("2026-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P3M")).toMillis() === DateTime.fromISO("2026-06-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-04-01", { zone: "utc" }).minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-03-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-02-28", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-31", { zone: "utc" }).minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-02-28", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-31", { zone: "utc" }).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-30", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1M")).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-03-28", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1Y")).toMillis() === DateTime.fromISO("2027-01-31", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M1D")).toMillis() === DateTime.fromISO("2026-04-02", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-01-31", { zone: "utc" }).plus(Duration.fromISO("P1M1D")).toMillis() === DateTime.fromISO("2026-03-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1Y1M1D")).toMillis() === DateTime.fromISO("2027-04-02", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1M"))).toMillis() === DateTime.fromISO("2026-05-01", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-03-01", { zone: "utc" }).plus(Duration.fromISO("P1M").plus(Duration.fromISO("P1D"))).toMillis() === DateTime.fromISO("2026-04-02", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);


(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-15T08:00:00Z", { zone: "utc" }).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-15T08:00:00Z", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-06-30T08:00:00Z", { zone: "utc" }).minus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-05-30T08:00:00Z", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("2026-05-31T08:00:00Z", { zone: "utc" }).plus(Duration.fromISO("P1M")).toMillis() === DateTime.fromISO("2026-06-30T08:00:00Z", { zone: "utc" }).toMillis())) throw new Error("Assertion failed"); return true; })(); })(null);
