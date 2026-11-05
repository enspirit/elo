require 'openapi3_parser'

# A generated OpenAPI document is either valid or useless.
#
# §9 exists so that a client can generate a typed call, which means the
# document is read by `openapi-generator`, by a gateway, by Postman — tools
# that do not forgive a missing `required` or a `$ref` pointing nowhere. An
# assertion on a key or two would not catch that; a parser does.
#
# This one is webspicy's own dependency (`openapi3_parser`), so it costs the
# suite nothing: it loads the body as a document, and reports every error the
# parser found rather than the first.
class IsAValidOpenapiDocument
  include Webspicy::Specification::Post

  MATCH = %r{It is a valid OpenAPI document}

  def self.match(service, descr)
    IsAValidOpenapiDocument.new if descr =~ MATCH
  end

  def check!
    document = Openapi3Parser.load(JSON.parse(invocation.response.body.to_s))
    return if document.valid?

    errors = document.errors.to_a.map { |error| "  #{error}" }
    fail!("The document is not a valid OpenAPI document:\n#{errors.join("\n")}")
  end
end
