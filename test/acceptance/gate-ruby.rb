# The grammar of the Ruby Elo is allowed to emit.
#
# The sibling of test/support/emitted-js-grammar.ts, and the same argument:
# the emitted output is not Ruby, it is a very small sub-grammar of Ruby, and
# writing it down turns "did the emitter remember to escape" into something a
# machine asks on every emission rather than something a reviewer asks once.
#
# Ruby is the target where this matters most, because a double-quoted Ruby
# string is executable:
#
#     Date.parse("2024-01-01#{`id`}")     # runs a shell command
#     /#@ivar/                            # reads a host instance variable
#
# Both were real (fixed in ee67619): the three temporal emitters used
# JSON.stringify, which escapes \ and " but not #, and escapeRegex escaped the
# brace but not the @. Neither is visible as "invalid Ruby" — both parse
# perfectly. They are visible as *node kinds that the emitted language has no
# business containing*, which is what this checks.
#
# Rules:
#
#   1. it parses;
#   2. no `xstring_literal` — a backtick command, anywhere, ever;
#   3. no instance, class or global variable reference — `#@x`, `#@@x`, `#$x`
#      interpolate without needing a brace, so they are the half of the
#      interpolation class that escaping `{` does not cover;
#   4. every `string_embexpr` (a `#{...}`) must be compiler-authored prose.
#      Interpolation is legitimate in Elo's emitted error messages — 210 sites
#      in the corpus, all of the form `#{v.inspect}` or `#{v.class}` — so it
#      cannot simply be banned. It is pinned by shape instead: the interpolated
#      code must be a local variable, optionally with `.inspect`/`.class`, and
#      nothing else. `#{`id`}` fails on the backtick inside it as well.
#
# Reads emitted Ruby on stdin or from the paths given, one program per line,
# and exits non-zero listing every violation.

require 'ripper'

# What a legitimate interpolation is made of.
#
# Interpolation cannot simply be banned outside the helper defs: the emitter
# builds its own error prose inline too, in the schema parsers it emits as
# lambdas — `rescue raise ".: expected Int, got #{v.inspect}"`. Measured over
# the corpus, 73 such sites, and all of them are the same tiny shape: a local
# variable, optionally `.inspect` or `.class`.
#
# So the shape is the rule. A value that escaped its literal brings something
# else with it — `#{`id`}` an xstring_literal, `#{system(...)}` a
# method_add_arg, `#{File.read(...)}` a const — and anything but these five
# node kinds and two method names fails.
#
# `:vcall` — a bare name Ripper could not see bound — is deliberately *not*
# on the list, even though a legitimate `#{v}` would parse that way if `v`
# were not visibly a parameter. It is 0 occurrences over the corpus, and
# allowing it would admit `#{exit}` and `#{caller}`, which are bare names too.
# If this ever fires on something legitimate, the right fix is to look at the
# emission, not to add `:vcall`.
ALLOWED_INTERPOLATION_NODES = [
  :string_embexpr, :var_ref, :call, :@period, :@ident
].freeze
ALLOWED_INTERPOLATION_METHODS = %w[inspect class].freeze

# Walk a Ripper s-expression, yielding every node that has a symbol head.
def each_node(sexp, &block)
  return unless sexp.is_a?(Array)
  block.call(sexp) if sexp[0].is_a?(Symbol)
  sexp.each { |child| each_node(child, &block) }
end

# The prelude helpers, which are exempt — the Ruby counterpart of the
# FunctionDeclaration exemption in the JavaScript gate, and for the same
# reason. `k_mul`, `p_err`, `p_array` and the rest are emitted as `def`s; they
# are the trusted base, they are where the guarded operations are supposed to
# live, and their error messages are the compiler's own prose. Everything
# outside a `def` is emitter output built around a value, which is what the
# rules below are about.
HELPER_NODES = [:def, :defs].freeze

# Walk only the part of the program that is not inside a helper definition.
def each_node_outside_helpers(sexp, &block)
  return unless sexp.is_a?(Array)
  return if sexp[0].is_a?(Symbol) && HELPER_NODES.include?(sexp[0])
  block.call(sexp) if sexp[0].is_a?(Symbol)
  sexp.each { |child| each_node_outside_helpers(child, &block) }
end

def violations_in(code)
  found = []

  sexp = Ripper.sexp(code)
  if sexp.nil?
    return [['parses', 'the emission is not valid Ruby']]
  end

  # A backtick command literal is never legitimate, not even in a helper:
  # nothing Elo emits shells out, on any path.
  each_node(sexp) do |node|
    if node[0] == :xstring_literal
      found << ['no-backticks', 'a backtick command literal runs a shell command']
    end
  end

  each_node_outside_helpers(sexp) do |node|
    case node[0]
    when :var_ref, :vcall
      name = node[1]
      if name.is_a?(Array) && [:@ivar, :@cvar, :@gvar].include?(name[0])
        found << ['no-host-variable',
                  "#{name[1]} reads host state, and interpolates with no brace to escape"]
      end
    when :string_embexpr
      kinds = []
      methods = []
      each_node(node) do |inner|
        kinds << inner[0]
        # `[:call, receiver, :".", [:@ident, "inspect", …]]`
        methods << inner[3][1] if inner[0] == :call && inner[3].is_a?(Array) && inner[3][1].is_a?(String)
      end
      unexpected = kinds.uniq - ALLOWED_INTERPOLATION_NODES
      foreign = methods.uniq - ALLOWED_INTERPOLATION_METHODS
      unless unexpected.empty? && foreign.empty?
        found << ['no-unlisted-interpolation',
                  'a #{...} that is not compiler-authored prose over a local: ' \
                  "#{(unexpected + foreign.map(&:to_sym)).inspect}. Every string the " \
                  'emitter builds around a value goes through escapeRubyDQ, which escapes ' \
                  '# so that no interpolation can survive.']
      end
    end
  end

  found.uniq
end

# A harness nobody has seen fail is a harness nobody knows works, and this one
# is all negative space. Each case is a real emission from a real fixed
# vulnerability, or a real emission that must stay allowed.
SELF_TEST = [
  [:reject, 'Date.parse("2024-01-01#{`id`}")',
   'the Ruby temporal-literal RCE: JSON.stringify did not escape #'],
  [:reject, '_m = s.match(/#@x (.*)$/)',
   'the extract() regex RCE: #@ivar needs no brace, so escaping { was not enough'],
  [:reject, 'raise "#{$PROGRAM_NAME}"', 'a global variable reference'],
  [:reject, 'x = "#{system(\'id\')}"', 'an interpolated method call'],
  [:reject, 'x = "#{File.read(\'/etc/passwd\')}"', 'an interpolated constant'],
  [:reject, 'x = "unterminated', 'an emission that is not valid Ruby'],
  [:accept, 'Date.parse("2024-01-01")', 'an ordinary temporal literal'],
  [:accept, '_m = s.match(/\\#@x (.*)$/)', 'the escaped form, which matches the same text'],
  [:accept, '->(v) { raise ".: expected Int, got #{v.inspect}" }',
   'compiler-authored prose over a lambda parameter'],
  [:accept, 'def k_mul(l, r); l * r; end; k_mul(2, 3)',
   'a prelude helper, which is the trusted base'],
].freeze

if ARGV.first == '--self-test'
  failures = 0
  SELF_TEST.each do |expectation, code, why|
    violations = violations_in(code)
    bad = (expectation == :reject) ? violations.empty? : !violations.empty?
    if bad
      failures += 1
      warn "  ✗ gate self-test: expected to #{expectation} #{why}"
      warn "      #{code}"
      warn "      got #{violations.inspect}"
    end
  end
  if failures.zero?
    puts "Ruby grammar gate: #{SELF_TEST.size} self-tests passed"
    exit 0
  end
  exit 1
end

sources = ARGV.empty? ? [['<stdin>', $stdin.read]] : ARGV.map { |p| [p, File.read(p)] }

failures = 0
checked = 0
sources.each do |name, content|
  content.each_line.with_index(1) do |line, number|
    next if line.strip.empty?
    checked += 1
    violations_in(line).each do |rule, detail|
      failures += 1
      warn "  ✗ #{name}:#{number} [#{rule}] #{detail}"
      warn "      #{line.strip[0, 160]}"
    end
  end
end

if failures.zero?
  puts "Ruby grammar: #{checked} emitted programs, 0 violations"
  exit 0
else
  warn "Ruby grammar: #{checked} emitted programs, #{failures} violations"
  exit 1
end
