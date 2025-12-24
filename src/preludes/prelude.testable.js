// Dayjs with plugins for temporal operations
const _dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
_dayjs.extend(duration);
_dayjs.extend(isoWeek);
_dayjs.extend(quarterOfYear);

// Time injection for testing: set KLANG_NOW environment variable
// Example: KLANG_NOW="2025-12-01T19:34:00" node test.js
let dayjs;
if (process.env.KLANG_NOW) {
  const fixedTime = _dayjs(process.env.KLANG_NOW);
  dayjs = function(input) {
    if (input === undefined) {
      return fixedTime.clone();
    }
    return _dayjs(input);
  };
  // Copy static methods from original dayjs
  Object.keys(_dayjs).forEach(key => {
    dayjs[key] = _dayjs[key];
  });
} else {
  dayjs = _dayjs;
}

// Klang namespace for testable temporal expressions
// In testable mode, the compiler uses klang.now() and klang.today()
// which can be overridden for deterministic testing.
const klang = {
  // Fixed time for testing (set via KLANG_NOW env var or klang.fixedTime)
  fixedTime: process.env.KLANG_NOW ? _dayjs(process.env.KLANG_NOW) : null,

  now() {
    return this.fixedTime ? this.fixedTime.clone() : dayjs();
  },

  today() {
    return this.fixedTime ? this.fixedTime.startOf('day') : dayjs().startOf('day');
  }
};
