(function(_) { return (function() { if (!(DateTime.now() > DateTime.fromISO("2020-01-01T00:00:00Z"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day') >= DateTime.fromISO("2020-01-01"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day').plus(Duration.fromISO("P1D")) > DateTime.now().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day').minus(Duration.fromISO("P1D")) < DateTime.now().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day').plus(Duration.fromISO("P1D")) > DateTime.now().startOf('day').minus(Duration.fromISO("P1D")))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now() > DateTime.fromISO("2024-01-01T00:00:00Z"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day') > DateTime.fromISO("2024-01-01"))) throw new Error("Assertion failed"); return true; })(); })(null);

(function(_) { return (function() { if (!(DateTime.fromISO("0001-01-01T00:00:00.000Z") < DateTime.fromISO("0002-01-01T00:00:00Z"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("9999-12-31T23:59:59.999Z") > DateTime.fromISO("9998-12-31T00:00:00Z"))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("0001-01-01T00:00:00.000Z") < DateTime.now().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("9999-12-31T23:59:59.999Z") > DateTime.now().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("0001-01-01T00:00:00.000Z") < DateTime.now())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.fromISO("9999-12-31T23:59:59.999Z") > DateTime.now())) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(DateTime.now().startOf('day') >= DateTime.fromISO("0001-01-01T00:00:00.000Z") && DateTime.now().startOf('day') < DateTime.fromISO("9999-12-31T23:59:59.999Z"))) throw new Error("Assertion failed"); return true; })(); })(null);
