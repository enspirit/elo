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

// The compiled code references `DateTime`, `Duration` and `Interval` (luxon)
// as free names — the emitted helpers name them whatever the expression was,
// `kMul` among them — so they are passed in as *parameters* of a function built
// around the code. Indirect eval would not do: it evaluates in global scope,
// where this module's `require`d bindings are not visible, and the first
// multiplication in a real program then fails with `Duration is not defined`.
const { DateTime, Duration, Interval } = require('luxon');

const fn = new Function('DateTime', 'Duration', 'Interval', `return (${workerData.code});`)(
  DateTime, Duration, Interval
);
parentPort.postMessage(fn(workerData.input));
