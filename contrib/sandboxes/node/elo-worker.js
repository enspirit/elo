'use strict';
// Worker half of the Node sandbox: evaluates one compiled Elo function and
// returns its result. Runs in an isolated worker thread whose heap is capped by
// the parent via resourceLimits; the parent also hard-kills it on timeout.
//
// `workerData.code`  — the string returned by Elo's compileToJavaScript / the
//                      `.toString()` of a `compile()` result, i.e. an
//                      expression of the form `(function(_) { ... })`.
// `workerData.input` — plain, JSON-shaped data (the `_` input).
const { parentPort, workerData } = require('worker_threads');

// The compiled code references `DateTime` / `Duration` (luxon) as free names;
// bind them in scope before evaluating. `(0, eval)` uses indirect eval so the
// code runs in this module's scope with those bindings visible.
const { DateTime, Duration } = require('luxon');

const fn = (0, eval)(workerData.code);
parentPort.postMessage(fn(workerData.input));
