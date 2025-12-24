(function() { if (!(dayjs().startOf('isoWeek') <= dayjs().startOf('day'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(dayjs().endOf('isoWeek') >= dayjs().startOf('day'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(dayjs().startOf('isoWeek') < dayjs().endOf('isoWeek'))) throw new Error("Assertion failed"); return true; })()
