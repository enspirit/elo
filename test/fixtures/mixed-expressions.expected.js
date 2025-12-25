(function() { if (!(klang.multiply(100, 1.1) > 100)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(klang.subtract(klang.multiply(10, 5), 10) == 40)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(75 >= 50 && 75 <= 100)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(50 > 0 && (true || 50 < 1000))) throw new Error("Assertion failed"); return true; })()
