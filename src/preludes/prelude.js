// Dayjs with duration and isoWeek plugins for temporal operations
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(duration);
dayjs.extend(isoWeek);
