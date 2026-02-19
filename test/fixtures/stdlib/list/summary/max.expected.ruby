->(_) { (raise "Assertion failed" unless [3, 1, 4, 1, 5].max == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [42].max == 42; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-3, -1, -4].max == -1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ([].max).nil?; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call([Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].max) == "DateTime"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].max == Date.today.beginning_of_day; true) }.call(nil);
