# Ruby resource sandbox for compiled Elo.
#
# Compile with Elo (`node bin/eloc -e '<expr>' -t ruby`), then run the emitted
# lambda here, in a forked child bounded by CPU, address-space, and wall-clock
# limits. The result travels back over a pipe.
#
#   require_relative 'run_elo'
#   run_elo('->(_) { _ * 2 }', 21)        # => 42
#
# Starting point; run the child as a low-privilege user and tune the limits.
require 'timeout'

def run_elo(src, input, cpu_s: 1, mem_mb: 512, wall_s: 2)
  reader, writer = IO.pipe

  pid = fork do
    reader.close
    begin
      # Best-effort: RLIMIT_AS is a Linux lever (macOS rejects it); the
      # wall-clock reaper below is the cross-platform backstop. The interpreter
      # is already mapped (fork copied it), so these bound further growth, not
      # the baseline — keep mem_mb generous.
      [[Process::RLIMIT_CPU, cpu_s], [Process::RLIMIT_AS, mem_mb * 1024 * 1024]].each do |res, lim|
        begin
          Process.setrlimit(res, lim)
        rescue StandardError
          # platform does not support this limit
        end
      end
      fn = eval(src) # rubocop:disable Security/Eval -- src is trusted Elo output
      writer.write(Marshal.dump([:ok, fn.call(input)]))
    rescue Exception => e # rubocop:disable Lint/RescueException -- report anything the child hits
      writer.write(Marshal.dump([:err, "#{e.class}: #{e.message}"]))
    ensure
      writer.close
    end
  end

  writer.close
  begin
    status, payload = Timeout.timeout(wall_s) do
      data = reader.read            # blocks until the child closes the pipe
      Process.waitpid(pid)
      data.empty? ? [:err, 'no output (killed by a resource limit?)'] : Marshal.load(data)
    end
    raise "Elo: #{payload}" if status == :err

    payload
  rescue Timeout::Error
    Process.kill('KILL', pid)
    Process.waitpid(pid) rescue nil
    raise 'Elo: evaluation timed out'
  ensure
    reader.close
  end
end

if __FILE__ == $PROGRAM_NAME
  raise 'ruby sandbox FAILED' unless run_elo('->(_) { _ * 2 }', 21) == 42
  raise 'ruby sandbox FAILED' unless run_elo("->(_) { _ + '!' }", 'hi') == 'hi!'
  puts 'ruby sandbox: OK'
end
