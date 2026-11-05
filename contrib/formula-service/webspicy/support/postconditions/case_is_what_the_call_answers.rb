require 'json'

# A descriptor's cases are a contract, not an illustration.
#
# §3: "a case's `input` is a request body by construction, so a client can
# offer 'try this example' by POSTing one unchanged, and the documentation of
# the API *is* its test suite". This is that sentence, checked: every case of
# the formula just described is POSTed to its own `call` link, and the answer
# must be the `expect` the descriptor published.
#
# It is black-box throughout — the descriptor says where to call and what to
# expect, and nothing here knows a formula's name. Which is also why it found
# something: the expect used to be written by `JSON.stringify` and the answer
# by `Output`, so a `Date` was published as `"2026-01-25T00:00:00.000+01:00"`
# and answered as `"2026-01-25"`.
class CaseIsWhatTheCallAnswers
  include Webspicy::Specification::Post

  MATCH = %r{Every case it documents is the answer the call gives}

  def self.match(service, descr)
    CaseIsWhatTheCallAnswers.new if descr =~ MATCH
  end

  def check!
    descriptor = invocation.dressed_body
    cases = descriptor[:cases]
    fail!("The formula documents no case") if cases.nil? || cases.empty?

    url = scope.to_real_url(descriptor[:links][:call], test_case) { |u, _| u }

    cases.each do |kase|
      # A case's own three keys are a Finitio struct, so symbols; what is
      # *inside* its input and expect is `Any`, so plain JSON — string keys,
      # and comparable with what the call answers as it comes off the wire.
      name, input, expect = kase[:name], kase[:input], kase[:expect]

      response = client.api.post(url, input, { 'Content-Type' => 'application/json' })
      unless response.status == 200
        fail!("Case `#{name}` is documented, but calling it answers #{response.status}")
      end

      got = JSON.parse(response.body.to_s)
      next if got == expect

      fail!(
        "Case `#{name}` is documented as answering #{expect.inspect}, " \
        "but the call answers #{got.inspect}"
      )
    end
  end
end
