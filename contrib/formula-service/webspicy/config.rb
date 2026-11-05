require 'webspicy'
require 'webspicy/web/specification/post/etag_caching_protocol'

# The black-box specification of the formula service.
#
# Webspicy specifies each endpoint as an operation — input, output and error
# schemas, plus pre/post/errconditions — and derives the tests from that. So
# this suite is not a second copy of
# `test/integration/formula-service.integration.test.ts`: that one drives the
# service in process and knows what it is made of, this one knows only what it
# answers over HTTP, and says so in a contract a client can read.
#
# The Finitio types in `schema.fio` do restate what `types.elo` declares, for
# the two formulas the examples use. That is the point rather than a slip: a
# black-box specification is written in the client's type system, and a
# divergence between the two is a finding. It is *checked* restatement — every
# response is dressed through it — which is the same rule the bundle format
# runs on.
#
#     contrib/formula-service/webspicy/run.sh          # boots the service, runs the suite
#     webspicy contrib/formula-service/webspicy/config.rb
#
# ELO_FORMULA_SERVICE picks the host, for a service already running elsewhere.

Webspicy::Configuration.new(Path.dir) do |c|
  c.host = ENV['ELO_FORMULA_SERVICE'] || 'http://127.0.0.1:8080'
  c.client = Webspicy::Web::HttpClient

  # Serving a formula has no state to reset between test cases, and that is a
  # property of the thing rather than an omission here: a formula is a function
  # of its argument, the catalogue is read-only, and `/call` stores nothing. So
  # there is no `before_each`, no seeds, and no ordering between the cases
  # below — which is also why every one of them is safe to run in parallel.

  # §2: a published version is immutable, so a pinned representation carries a
  # strong ETag and may be revalidated. The built-in condition does the
  # protocol: the specs declare it in prose.
  c.postcondition Webspicy::Web::Specification::Post::ETagCachingProtocol

  # §3: a case's input is a request body by construction, and its expect is the
  # response body that goes with it — so the documentation of the API is its
  # test suite. `support/postconditions/` has the condition that proves it.
  c.postcondition CaseIsWhatTheCallAnswers

  # §9: a generated OpenAPI document is either valid or useless, and only a
  # parser can say which. Webspicy brings one.
  c.postcondition IsAValidOpenapiDocument
end
