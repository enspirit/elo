require 'date'
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
end
