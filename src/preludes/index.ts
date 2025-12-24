/**
 * Prelude content for all target languages and compilation modes.
 * This is the single source of truth for preludes used by both CLI and web.
 */

export type Target = 'javascript' | 'ruby' | 'sql';
export type Mode = 'production' | 'testable';

const preludes: Record<Target, Record<Mode, string>> = {
  javascript: {
    production: `const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);`,

    testable: `// Dayjs with plugins for temporal operations
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
};`
  },

  ruby: {
    production: `require 'date'
require 'active_support/all'`,

    testable: `require 'date'
require 'active_support/all'

# Klang module for testable temporal expressions
# In testable mode, the compiler uses Klang.now and Klang.today
# which can be overridden for deterministic testing.
module Klang
  class << self
    # Fixed time for testing (set via KLANG_NOW env var or directly)
    attr_accessor :fixed_time

    def now
      fixed_time || DateTime.now
    end

    def today
      fixed_time ? fixed_time.to_date : Date.today
    end
  end
end

# Time injection for testing: set KLANG_NOW environment variable
# Example: KLANG_NOW="2025-12-01T19:34:00" ruby -r ./prelude.rb test.rb
# This works for both production mode (patches DateTime/Date/Time)
# and testable mode (sets Klang.fixed_time)
if ENV['KLANG_NOW'] && !ENV['KLANG_NOW'].empty?
  KLANG_FIXED_TIME = DateTime.parse(ENV['KLANG_NOW'])
  Klang.fixed_time = KLANG_FIXED_TIME

  class DateTime
    class << self
      alias_method :_original_now, :now
      def now
        KLANG_FIXED_TIME
      end
    end
  end

  class Date
    class << self
      alias_method :_original_today, :today
      def today
        KLANG_FIXED_TIME.to_date
      end
    end
  end

  class Time
    class << self
      alias_method :_original_now, :now
      def now
        KLANG_FIXED_TIME.to_time
      end
    end
  end
end`
  },

  sql: {
    production: `-- No prelude needed for production SQL mode
-- All temporal expressions use native PostgreSQL functions`,

    testable: `-- SQL prelude for Klang
-- These functions provide time injection for testable SQL compilation mode.
-- Set klang.now via: SET klang.now = '2025-12-01T12:00:00';
-- Clear with: RESET klang.now;

CREATE OR REPLACE FUNCTION klang_now() RETURNS TIMESTAMP AS $$
BEGIN
  -- Check if klang.now is set and not empty
  IF current_setting('klang.now', true) IS NOT NULL
     AND current_setting('klang.now', true) <> '' THEN
    RETURN current_setting('klang.now', true)::TIMESTAMP;
  ELSE
    RETURN CURRENT_TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION klang_today() RETURNS DATE AS $$
BEGIN
  -- Check if klang.now is set and not empty
  IF current_setting('klang.now', true) IS NOT NULL
     AND current_setting('klang.now', true) <> '' THEN
    RETURN current_setting('klang.now', true)::DATE;
  ELSE
    RETURN CURRENT_DATE;
  END IF;
END;
$$ LANGUAGE plpgsql;`
  }
};

/**
 * Get the prelude content for a given target language and mode.
 */
export function getPrelude(target: Target, mode: Mode): string {
  return preludes[target][mode];
}
