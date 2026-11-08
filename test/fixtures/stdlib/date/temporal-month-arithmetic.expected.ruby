











->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-04-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P2M") == Date.parse("2026-05-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P3M") == Date.parse("2026-06-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-04-01") - ActiveSupport::Duration.parse("P1M") == Date.parse("2026-03-01"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless Date.parse("2026-01-31") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-02-28"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-31") - ActiveSupport::Duration.parse("P1M") == Date.parse("2026-02-28"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-05-31") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-06-30"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-01-31") + ActiveSupport::Duration.parse("P1M") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-03-28"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-01-31") + ActiveSupport::Duration.parse("P1Y") == Date.parse("2027-01-31"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M1D") == Date.parse("2026-04-02"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-01-31") + ActiveSupport::Duration.parse("P1M1D") == Date.parse("2026-03-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1Y1M1D") == Date.parse("2027-04-02"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-05-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") + ActiveSupport::Duration.parse("P1D") == Date.parse("2026-04-02"); true) }.call(nil);


->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless k_add(DateTime.parse("2026-05-15T08:00:00Z"), ActiveSupport::Duration.parse("P1M")) == DateTime.parse("2026-06-15T08:00:00Z"); true) }.call(nil);
->(_) { def k_sub(l, r); if (Date === l || Time === l) && (Date === r || Time === r); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless k_sub(DateTime.parse("2026-06-30T08:00:00Z"), ActiveSupport::Duration.parse("P1M")) == DateTime.parse("2026-05-30T08:00:00Z"); true) }.call(nil);
->(_) { def k_add(l, r); return r + l if ActiveSupport::Duration === l && (Date === r || Time === r); l + r end; (raise "Assertion failed" unless k_add(DateTime.parse("2026-05-31T08:00:00Z"), ActiveSupport::Duration.parse("P1M")) == DateTime.parse("2026-06-30T08:00:00Z"); true) }.call(nil);
