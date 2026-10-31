"""Python resource sandbox for compiled Elo.

Compile with Elo (`node bin/eloc -e '<expr>' -t python`), then run the emitted
lambda here, in a child process bounded by CPU, address-space, and wall-clock
limits. The input is fed as JSON on stdin, which keeps it plain data by
construction.

    from run_elo import run_elo
    run_elo("(lambda _: _ * 2)", 21)                     # -> 42
    run_elo("(lambda _: _.upper())", "hi")               # -> "HI"

These are starting points; tune the limits and run as a low-privilege user.
"""
import json
import resource
import subprocess
import sys

_CHILD = r"""
import sys, json
{prelude}
_fn = {src}
print(json.dumps(_fn(json.load(sys.stdin))))
"""


def run_elo(src, data, *, cpu_s=1, mem_mb=512, wall_s=2, prelude=""):
    """Evaluate a compiled Elo lambda `src` against `data`.

    cpu_s  : hard CPU-seconds ceiling (RLIMIT_CPU).
    mem_mb : address-space ceiling (RLIMIT_AS). Must leave room for the Python
             interpreter itself — keep it generous (hundreds of MB), it bounds
             runaway growth, not the interpreter's baseline.
    wall_s : wall-clock timeout; the child is killed when it elapses.
    prelude: extra lines injected before the lambda (e.g. Elo's --prelude).
    """
    code = _CHILD.format(prelude=prelude, src=src)

    def _limits():
        # Best-effort: RLIMIT_AS is a Linux lever; macOS rejects it. The
        # wall-clock timeout below is the cross-platform backstop, so a platform
        # that can't enforce a limit still runs (just without that ceiling).
        mem = mem_mb * 1024 * 1024
        for res, soft_hard in ((resource.RLIMIT_CPU, (cpu_s, cpu_s)),
                               (resource.RLIMIT_AS, (mem, mem))):
            try:
                resource.setrlimit(res, soft_hard)
            except (ValueError, OSError):
                pass

    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            input=json.dumps(data),
            capture_output=True,
            text=True,
            timeout=wall_s,
            preexec_fn=_limits,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Elo: evaluation timed out after %ss" % wall_s)

    if proc.returncode != 0:
        detail = proc.stderr.strip() or ("killed (signal/limit), exit %s" % proc.returncode)
        raise RuntimeError("Elo: evaluation failed: " + detail)
    return json.loads(proc.stdout)


if __name__ == "__main__":
    assert run_elo("(lambda _: _ * 2)", 21) == 42
    assert run_elo("(lambda _: _.upper())", "hi") == "HI"
    # A CPU-bound runaway is contained — by RLIMIT_CPU where supported, and by
    # the wall-clock timeout everywhere.
    try:
        run_elo("(lambda _: sum(range(10**9)))", 0, cpu_s=1, wall_s=2)
        raise SystemExit("python sandbox FAILED: runaway not contained")
    except RuntimeError:
        pass
    print("python sandbox: OK")
