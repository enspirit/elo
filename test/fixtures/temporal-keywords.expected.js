(function(_) { return (function() { if (!(dayjs() > dayjs('2020-01-01T00:00:00Z'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs().startOf('day') >= dayjs('2020-01-01'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs().startOf('day').add(dayjs.duration('P1D')) > dayjs().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs().startOf('day').subtract(dayjs.duration('P1D')) < dayjs().startOf('day'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs().startOf('day').add(dayjs.duration('P1D')) > dayjs().startOf('day').subtract(dayjs.duration('P1D')))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs() > dayjs('2024-01-01T00:00:00Z'))) throw new Error("Assertion failed"); return true; })(); })(null);
(function(_) { return (function() { if (!(dayjs().startOf('day') > dayjs('2024-01-01'))) throw new Error("Assertion failed"); return true; })(); })(null);
