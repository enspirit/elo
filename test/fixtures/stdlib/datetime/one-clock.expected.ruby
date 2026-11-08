









->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; def k_today(tz); k_now(tz).to_date end; (raise "Assertion failed" unless (t = k_now("UTC"); t.beginning_of_day == k_today("UTC")); true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; def k_today(tz); k_now(tz).to_date end; (raise "Assertion failed" unless (t = k_now("UTC"); (->(v) { case v when DateTime, Time; v.to_date when Date; v when String; raise ".: expected Date (YYYY-MM-DD), got #{v.inspect}" unless v =~ /^\d{4}-\d{2}-\d{2}$/; Date.parse(v) else raise ".: expected Date, got #{v.class}" end }).call(t) == k_today("UTC")); true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; def k_today(tz); k_now(tz).to_date end; (raise "Assertion failed" unless k_now("UTC").day == k_today("UTC").day; true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; def k_today(tz); k_now(tz).to_date end; (raise "Assertion failed" unless k_now("UTC").month == k_today("UTC").month; true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; def k_today(tz); k_now(tz).to_date end; (raise "Assertion failed" unless k_now("UTC").year == k_today("UTC").year; true) }.call(nil);



->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; (raise "Assertion failed" unless (t = k_now("UTC"); (((t - t.beginning_of_day) * 86400).to_i.seconds.to_i / 3600.0) >= t.hour); true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; (raise "Assertion failed" unless (t = k_now("UTC"); (((t - t.beginning_of_day) * 86400).to_i.seconds.to_i / 3600.0) < t.hour + 1); true) }.call(nil);


->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; (raise "Assertion failed" unless (t = k_now("UTC"); (((t - t.beginning_of_day) * 86400).to_i.seconds.to_i / 60.0) >= t.hour * 60 + t.minute); true) }.call(nil);
->(_) { def k_now(tz); Time.now.in_time_zone(ActiveSupport::TimeZone[tz]).to_datetime.change(offset: 0) end; (raise "Assertion failed" unless (t = k_now("UTC"); (((t - t.beginning_of_day) * 86400).to_i.seconds.to_i / 60.0) < t.hour * 60 + t.minute + 1); true) }.call(nil);
