->(_) { (raise "Assertion failed" unless [3, 1, 4, 1, 5].min == 1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [42].min == 42; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-3, -1, -4].min == -4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ([].min).nil?; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call([Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].min) == "DateTime"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].min == Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D"); true) }.call(nil);
