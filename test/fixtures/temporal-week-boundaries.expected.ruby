(raise "Assertion failed" unless Date.today.beginning_of_week <= Date.today; true)
(raise "Assertion failed" unless Date.today.end_of_week >= Date.today; true)
(raise "Assertion failed" unless Date.today.beginning_of_week < Date.today.end_of_week; true)
