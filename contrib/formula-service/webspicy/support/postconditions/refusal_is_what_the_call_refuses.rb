require 'json'

# A refusal is a contract too.
#
# `cases.elo` holds two lists: the inputs a formula answers and the inputs it
# refuses. The first list is checked by `CaseIsWhatTheCallAnswers`; this is the
# second one, and it is the half a client has to write error handling against.
#
# For every refusal the descriptor documents, this POSTs the input to the
# formula's own `call` link and holds the answer to what the bundle said: a
# `422`, carrying that `kind`, that `path` where one is stated, that `label`
# where one is stated, and `field` — which §5 derives from `path` and which is
# the whole reason a form can put the message in the right place.
#
# The message itself is deliberately not compared. It is prose, the bundle does
# not promise it, and neither does this.
class RefusalIsWhatTheCallRefuses
  include Webspicy::Specification::Post

  MATCH = %r{Every refusal it documents is a refusal the call makes}

  def self.match(service, descr)
    RefusalIsWhatTheCallRefuses.new if descr =~ MATCH
  end

  def check!
    descriptor = invocation.dressed_body
    refusals = descriptor[:refusals]
    return if refusals.nil? || refusals.empty?

    url = scope.to_real_url(descriptor[:links][:call], test_case) { |u, _| u }

    refusals.each do |refusal|
      name, input = refusal[:name], refusal[:input]
      response = client.api.post(url, input, { 'Content-Type' => 'application/json' })

      unless response.status == 422
        fail!("Refusal `#{name}` is documented, but calling it answers #{response.status}")
      end

      body = JSON.parse(response.body.to_s)
      expected = { 'kind' => refusal[:kind] }
      expected['path'] = refusal[:path] if refusal[:path]
      expected['label'] = refusal[:label] if refusal[:label]
      expected['field'] = refusal[:path].sub(/\A\./, '') if refusal[:path]

      got = body.slice(*expected.keys)
      next if got == expected

      fail!("Refusal `#{name}` is documented as #{expected.inspect}, but the call answers #{got.inspect}")
    end
  end
end
