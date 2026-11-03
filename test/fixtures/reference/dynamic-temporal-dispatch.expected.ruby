













->(_) { (raise "Assertion failed" unless (f = ->(x) { x + ActiveSupport::Duration.parse("P1D") }; f.call(ActiveSupport::Duration.parse("P1D"))) == ActiveSupport::Duration.parse("P2D"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x) { k_sub(x, ActiveSupport::Duration.parse("P1D")) }; f.call(ActiveSupport::Duration.parse("P2D"))) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x + y }; f.call(ActiveSupport::Duration.parse("P1D"), ActiveSupport::Duration.parse("P1D"))) == ActiveSupport::Duration.parse("P2D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x * 2 }; f.call(ActiveSupport::Duration.parse("P1D"))) == ActiveSupport::Duration.parse("P2D"); true) }.call(nil);
->(_) { def k_div(l, r); return l.fdiv(r) if l.is_a?(Integer) && r.is_a?(Integer); l / r end; (raise "Assertion failed" unless (f = ->(x) { k_div(x, 2) }; f.call(ActiveSupport::Duration.parse("P2D"))) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x) { x == ActiveSupport::Duration.parse("P1D") }; f.call(ActiveSupport::Duration.parse("P1D"))) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x == ActiveSupport::Duration.parse("P1D") }; f.call(ActiveSupport::Duration.parse("P2D"))) == false; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x != ActiveSupport::Duration.parse("P1D") }; f.call(ActiveSupport::Duration.parse("P2D"))) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x == y }; f.call(ActiveSupport::Duration.parse("P1D"), ActiveSupport::Duration.parse("P1D"))) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x == y }; f.call(ActiveSupport::Duration.parse("PT24H"), ActiveSupport::Duration.parse("P1D"))) == true; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x) { x < ActiveSupport::Duration.parse("P2D") }; f.call(ActiveSupport::Duration.parse("P1D"))) == true; true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x >= ActiveSupport::Duration.parse("P1D") }; f.call(ActiveSupport::Duration.parse("P2D"))) == true; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x) { x + ActiveSupport::Duration.parse("P1D") }; f.call(DateTime.parse("2024-01-15T00:00:00Z"))) == DateTime.parse("2024-01-16T00:00:00Z"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x) { k_sub(x, ActiveSupport::Duration.parse("P1D")) }; f.call(DateTime.parse("2024-01-16T00:00:00Z"))) == DateTime.parse("2024-01-15T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless (f = ->(x) { x == DateTime.parse("2024-01-15T00:00:00Z") }; f.call(DateTime.parse("2024-01-15T00:00:00Z"))) == true; true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(x, y) }; f.call(DateTime.parse("2024-01-16T00:00:00Z"), DateTime.parse("2024-01-15T00:00:00Z"))) == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless (f = ->(x, y) { x + y }; f.call(Date.parse("2026-03-01"), ActiveSupport::Duration.parse("P1M"))) == Date.parse("2026-04-01"); true) }.call(nil);
->(_) { def k_sub(l, r); if (l.is_a?(Date) || l.is_a?(Time)) && (r.is_a?(Date) || r.is_a?(Time)); return ((l.to_datetime - r.to_datetime) * 86400).to_i.seconds end; l - r; end; (raise "Assertion failed" unless (f = ->(x, y) { k_sub(x, y) }; f.call(Date.parse("2026-04-01"), ActiveSupport::Duration.parse("P1M"))) == Date.parse("2026-03-01"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("P1D") + ActiveSupport::Duration.parse("P1D") == ActiveSupport::Duration.parse("P2D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("P1D") == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless ActiveSupport::Duration.parse("PT24H") == ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2024-01-15T00:00:00Z") + ActiveSupport::Duration.parse("P1D") == DateTime.parse("2024-01-16T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2026-03-01") + ActiveSupport::Duration.parse("P1M") == Date.parse("2026-04-01"); true) }.call(nil);
