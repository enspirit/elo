const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
