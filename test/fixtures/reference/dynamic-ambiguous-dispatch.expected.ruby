














->(_) { (raise "Assertion failed" unless [3.7].min.floor == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-3.2].min.floor == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [5].min.floor == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [3.2].min.ceil == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-3.9].min.ceil == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [5].min.ceil == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [3.5].min.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-2.5].min.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [5].min.round == 5; true) }.call(nil);


->(_) { (raise "Assertion failed" unless [DateTime.parse("2024-06-15T10:30:00Z")].min.to_datetime.beginning_of_day == DateTime.parse("2024-06-15T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.beginning_of_day == DateTime.parse("2024-06-15T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_day >= DateTime.parse("2024-06-15T23:59:59Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_day < DateTime.parse("2024-06-16T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-12")].min.to_datetime.beginning_of_week == DateTime.parse("2024-06-10T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-12")].min.to_datetime.end_of_week >= DateTime.parse("2024-06-16T23:59:59Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-12")].min.to_datetime.end_of_week < DateTime.parse("2024-06-17T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.beginning_of_month == DateTime.parse("2024-06-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_month >= DateTime.parse("2024-06-30T23:59:59Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_month < DateTime.parse("2024-07-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-08-15")].min.to_datetime.beginning_of_quarter == DateTime.parse("2024-07-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-08-15")].min.to_datetime.end_of_quarter >= DateTime.parse("2024-09-30T23:59:59Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-08-15")].min.to_datetime.end_of_quarter < DateTime.parse("2024-10-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.beginning_of_year == DateTime.parse("2024-01-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_year >= DateTime.parse("2024-12-31T23:59:59Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.parse("2024-06-15")].min.to_datetime.end_of_year < DateTime.parse("2025-01-01T00:00:00Z"); true) }.call(nil);


->(_) { (raise "Assertion failed" unless 3.7.floor == 3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.2.floor == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.2.ceil == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -3.9.ceil == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless 3.5.round == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless -2.5.round == -3; true) }.call(nil);
->(_) { (raise "Assertion failed" unless DateTime.parse("2024-06-15T10:30:00Z").beginning_of_day == DateTime.parse("2024-06-15T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-06-15").to_datetime.beginning_of_day == DateTime.parse("2024-06-15T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-06-12").to_datetime.beginning_of_week == DateTime.parse("2024-06-10T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-06-15").to_datetime.beginning_of_month == DateTime.parse("2024-06-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-08-15").to_datetime.beginning_of_quarter == DateTime.parse("2024-07-01T00:00:00Z"); true) }.call(nil);
->(_) { (raise "Assertion failed" unless Date.parse("2024-06-15").to_datetime.beginning_of_year == DateTime.parse("2024-01-01T00:00:00Z"); true) }.call(nil);
