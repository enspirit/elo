














->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") * 2 == Date.parse("2026-05-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + 2 * ActiveSupport::Duration.parse("P1M") == Date.parse("2026-05-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") * 3 == Date.parse("2026-06-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + -1 * ActiveSupport::Duration.parse("P1M") == Date.parse("2026-02-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") * 1 == Date.parse("2026-04-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") * 0 == Date.parse("2026-03-01"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless Date.parse("2026-01-31") + ActiveSupport::Duration.parse("P1M") * 1 == Date.parse("2026-02-28"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-12-31") + ActiveSupport::Duration.parse("P1M") * 2 == Date.parse("2027-02-28"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1Y") * 2 == Date.parse("2028-03-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M1D") * 2 == Date.parse("2026-05-03"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1Y1M") * 2 == Date.parse("2028-05-01"); true) }.call(nil);


->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless Date.parse("2026-01-31") + k_sub(ActiveSupport::Duration.parse("P1M"), ActiveSupport::Duration.parse("P10D")) == Date.parse("2026-02-18"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless Date.parse("2026-03-01") + k_sub(ActiveSupport::Duration.parse("P2M"), ActiveSupport::Duration.parse("P1M")) == Date.parse("2026-04-01"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless Date.parse("2026-03-01") + k_sub(ActiveSupport::Duration.parse("P1M"), ActiveSupport::Duration.parse("P1M")) == Date.parse("2026-03-01"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless Date.parse("2026-03-01") + k_sub(ActiveSupport::Duration.parse("P1M1D"), ActiveSupport::Duration.parse("P1D")) == Date.parse("2026-04-01"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless Date.parse("2026-03-01") + k_sub(ActiveSupport::Duration.parse("P1Y"), ActiveSupport::Duration.parse("P1M")) == Date.parse("2027-02-01"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-05-01"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") + ActiveSupport::Duration.parse("P1D") == Date.parse("2026-04-02"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless DateTime.parse("2026-05-31T08:00:00Z") + ActiveSupport::Duration.parse("P1M") * 2 == DateTime.parse("2026-07-31T08:00:00Z"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless DateTime.parse("2026-05-15T08:00:00Z") + k_sub(ActiveSupport::Duration.parse("P1M"), ActiveSupport::Duration.parse("P1D")) == DateTime.parse("2026-06-14T08:00:00Z"); true) }.call(nil);
