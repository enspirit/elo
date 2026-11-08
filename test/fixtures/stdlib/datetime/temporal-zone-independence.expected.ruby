








->(_) { (raise "Assertion failed" unless (((Date.parse("2026-03-11").to_datetime.beginning_of_day - Date.parse("2026-01-10").to_datetime.beginning_of_day) * 86400).to_i.seconds.to_i / 86400.0) == 60; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((Date.parse("2026-03-11") - Date.parse("2026-01-10")).to_i.days.to_i / 86400.0) == 60; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((Date.parse("2026-11-02") - Date.parse("2026-10-01")).to_i.days.to_i / 86400.0) == 32; true) }.call(nil);


->(_) { (raise "Assertion failed" unless ((Date.parse("2026-03-30") - Date.parse("2026-03-28")).to_i.days.to_i / 86400.0) == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ((Date.parse("2026-10-26") - Date.parse("2026-10-24")).to_i.days.to_i / 86400.0) == 2; true) }.call(nil);


->(_) { (raise "Assertion failed" unless DateTime.parse("2026-01-01T00:30:00Z").year == 2026; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-01-01T00:30:00Z").month == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-01-01T00:30:00Z").day == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-01-01T00:30:00Z").hour == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-12-31T23:30:00Z").day == 31; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-12-31T23:30:00Z").month == 12; true) }.call(nil);


->(_) { (raise "Assertion failed" unless DateTime.parse("2026-01-01T00:30:00Z").beginning_of_day == DateTime.parse("2026-01-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-03-29T23:30:00Z").beginning_of_month == DateTime.parse("2026-03-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2026-12-31T23:30:00Z").end_of_day < DateTime.parse("2027-01-01T00:00:00Z"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless [DateTime.parse("2026-01-01T00:30:00Z")].min.day == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [DateTime.parse("2026-01-01T00:30:00Z")].min.to_datetime.beginning_of_day == DateTime.parse("2026-01-01T00:00:00Z"); true) }.call(nil);


->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-01T00:30:00Z").day == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (((->(s) { raise ".: expected Date (YYYY-MM-DD), got #{s.inspect}" unless s =~ /^\d{4}-\d{2}-\d{2}$/; Date.parse(s) }).call("2026-03-11") - (->(s) { raise ".: expected Date (YYYY-MM-DD), got #{s.inspect}" unless s =~ /^\d{4}-\d{2}-\d{2}$/; Date.parse(s) }).call("2026-01-10")).to_i.days.to_i / 86400.0) == 60; true) }.call(nil);
