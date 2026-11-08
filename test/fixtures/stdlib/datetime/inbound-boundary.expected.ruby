














->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00").hour == 10; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:30:00").minute == 30; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (->(s) { raise ".: expected Date (YYYY-MM-DD), got #{s.inspect}" unless s =~ /^\d{4}-\d{2}-\d{2}$/; Date.parse(s) }).call("2026-01-15").day == 15; true) }.call(nil);



->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00Z").hour == 10; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+00:00").hour == 10; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00-00:00").hour == 10; true) }.call(nil);




->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+01:00").hour == 9; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+05:30").hour == 4; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+05:30").minute == 30; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00-05:00").hour == 15; true) }.call(nil);


->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T00:30:00+02:00").day == 14; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T00:30:00+02:00").hour == 22; true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T23:30:00-02:00").day == 16; true) }.call(nil);




->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+01:00") == (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T09:00:00Z"); true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T12:00:00+03:00") == (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+01:00"); true) }.call(nil);
->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00+01:00") < (->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T10:00:00Z"); true) }.call(nil);



->(_) { def k_wall(v, tz); if v.is_a?(String); d = DateTime.parse(v); return d.change(offset: 0) unless v =~ /(?:Z|[+-]\d{2}:?\d{2})\s*\z/; v = d end; v.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0); end; (raise "Assertion failed" unless (->(v) { case v when DateTime, Time; k_wall(v, "UTC").to_date when Date; v when String; raise ".: expected Date (YYYY-MM-DD), got #{v.inspect}" unless v =~ /^\d{4}-\d{2}-\d{2}$/; Date.parse(v) else raise ".: expected Date, got #{v.class}" end }).call((->(s) { k_wall(s, "UTC") rescue raise ".: expected Datetime, got invalid datetime #{s.inspect}" }).call("2026-01-15T00:30:00+02:00")) == Date.parse("2026-01-14"); true) }.call(nil);
