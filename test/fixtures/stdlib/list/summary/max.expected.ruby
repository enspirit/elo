->(_) { (raise "Assertion failed" unless [3, 1, 4, 1, 5].max == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [42].max == 42; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-3, -1, -4].max == -1; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ([].max).nil?; true) }.call(nil);


->(_) { (raise "Assertion failed" unless (->(v) { case v when NilClass; 'Null' when ActiveSupport::Duration; 'Duration' when Date, DateTime, Time; 'DateTime' when Integer; 'Int' when Float; 'Float' when TrueClass, FalseClass; 'Bool' when String; 'String' when Proc; 'Function' when Array; 'List' else 'Tuple' end }).call([Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].max) == "DateTime"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [Date.today.beginning_of_day, Date.today.beginning_of_day - ActiveSupport::Duration.parse("P1D")].max == Date.today.beginning_of_day; true) }.call(nil);


->(_) { (raise "Assertion failed" unless [3, 7].max == 7; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [7, 3].max == 7; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [-5, 2].max == 2; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [4, 4].max == 4; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [2.5, 1.5].max == 2.5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [1, 2.5].max == 2.5; true) }.call(nil);

->(_) { (raise "Assertion failed" unless [[15, 10].min, 0].max == 10; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[-3, 10].min, 0].max == 0; true) }.call(nil);
->(_) { (raise "Assertion failed" unless [[5, 10].min, 0].max == 5; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["a", "b"].max == "b"; true) }.call(nil);
->(_) { (raise "Assertion failed" unless ["b", "a"].max == "b"; true) }.call(nil);
