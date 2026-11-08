"""The grammar of the Python Elo is allowed to emit.

The third of three, after test/support/emitted-js-grammar.ts and
test/acceptance/gate-ruby.rb, and the same argument: the emitted output is not
Python, it is a very small sub-grammar of Python, and writing it down turns
"does this emitter reach something it should not" into a question the build
asks on every emission rather than one a reviewer asks once.

What makes it worth having on Python specifically is the attribute rule. The
whole Python sandbox-escape vocabulary is spelled with dunders --
``x.__class__.__bases__[0].__subclasses__()``, ``f.__globals__``,
``().__reduce__`` -- and the emitted corpus reads exactly 34 attribute names,
none of them a dunder. A closed list of 34 therefore bans the entire class by
construction rather than by denylist, which is the one thing a denylist of
meta-names could never do.

Rules:

  1. it parses;
  2. every attribute name is in ALLOWED_ATTRIBUTES;
  3. every free name is in ALLOWED_NAMES -- which bans ``eval``, ``exec``,
     ``__import__``, ``open``, ``getattr``, ``globals`` and ``compile`` by
     leaving them off, not by naming them;
  4. every node kind is in ALLOWED_NODES, which bans ``import``, ``def``,
     ``class``, ``global`` and assignment-by-statement;
  5. a key subscript's index is integral by construction.

There is deliberately no rule about *strings* that look like dunders. A data
key named ``__class__`` is legitimate Elo data, and a string cannot become an
attribute without ``getattr`` or ``__getattribute__``, neither of which rule 3
lets through. A rule there would be false positives bought with no coverage.

Unlike JavaScript and Ruby there is no helper region to exempt: Python's
prelude is installed separately rather than inlined into each program, so
every helper is a free name and everything in the emission is emitter output.

Reads emitted Python on stdin or from the paths given, one program per line.
"""

import ast
import sys

# Every free name the emitted code may use.
#
# 84, measured over the whole fixture corpus. Three groups: the prelude
# helpers, which arrive as free names because the Python prelude is installed
# rather than inlined; the handful of modules the prelude needs; and the
# builtins the emitters actually call. A list someone edits on purpose --
# adding a name is a decision about what the emitted language may reach.
ALLOWED_NAMES = {
    # Prelude helpers
    'kAdd', 'kAssert', 'kAssertFails', 'kAt', 'kBool', 'kData', 'kDeepMerge',
    'kDiv', 'kEq', 'kFetch', 'kFetchAny', 'kFetchObject', 'kFirst', 'kIndexOf',
    'kIntersection', 'kLast', 'kMod', 'kMul', 'kNeg', 'kPad', 'kParseDate',
    'kParseDatetime', 'kParseDuration', 'kPatch', 'kPow', 'kRound', 'kRoundTo',
    'kSplit', 'kStrMul', 'kString', 'kSub', 'kToString', 'kTypeOf',
    # Schema-parser helpers
    'pAny', 'pArray', 'pAssert', 'pBool', 'pData', 'pDate', 'pDatetime',
    'pDuration', 'pFloat', 'pInt', 'pNull', 'pSchema', 'pString', 'pSubtype',
    'pUnion', 'pUnwrap',
    # Temporal helpers and the classes the prelude defines
    'EloDuration', 'EloInterval', '_dt', '_elo_dt',
    # 0259 D1: NOW and TODAY read the declared zone through these, rather than
    # `_dt.datetime.now()` inline, so the conversion lives in one place and
    # the zone is its argument.
    '_elo_now', '_elo_today',
    '_elo_start_of_day', '_elo_end_of_day',
    '_elo_start_of_week', '_elo_end_of_week',
    '_elo_start_of_month', '_elo_end_of_month',
    '_elo_start_of_quarter', '_elo_end_of_quarter',
    '_elo_start_of_year', '_elo_end_of_year',
    # Modules the prelude imports
    'functools', 'math', 're', 'ZoneInfo',
    # Builtins the emitters call. Note what is absent: eval, exec, compile,
    # __import__, open, getattr, setattr, globals, locals, vars, dir, input,
    # breakpoint, type, object, super, memoryview.
    'abs', 'all', 'any', 'bool', 'chr', 'enumerate', 'filter', 'float', 'int',
    'isinstance', 'len', 'list', 'map', 'max', 'min', 'next', 'range',
    'reversed', 'sorted', 'str', 'sum',
}

# Every attribute name the emitted code may read.
#
# 34, measured. The security value is the absence: no dunder, and nothing that
# yields a callable bound to something else.
ALLOWED_ATTRIBUTES = {
    # EloDuration / EloInterval / datetime
    'datetime', 'from_iso', 'from_timedelta', 'now', 'start', 'end',
    'year', 'month', 'day', 'hour', 'minute',
    'in_days', 'in_hours', 'in_minutes', 'in_months', 'in_quarters',
    'in_seconds', 'in_weeks', 'in_years',
    # str
    'upper', 'lower', 'strip', 'lstrip', 'rstrip', 'startswith', 'endswith',
    'replace', 'join',
    # dict / re / math / functools
    'get', 'group', 'search', 'ceil', 'floor', 'reduce',
}

# Every node kind the emitted grammar contains.
#
# 44, measured. An expression language emits expressions: no Import, no
# FunctionDef, no ClassDef, no Global, no Assign (the emitter uses the walrus),
# no Try, no While, no Await, no Yield.
ALLOWED_NODES = {
    'Add', 'And', 'Attribute', 'BinOp', 'BoolOp', 'Call', 'Compare',
    'Constant', 'Dict', 'Div', 'Eq', 'Expr', 'GeneratorExp', 'Gt', 'GtE',
    'IfExp', 'In', 'Is', 'IsNot', 'Lambda', 'List', 'ListComp', 'Load', 'Lt',
    'LtE', 'Mod', 'Module', 'Mult', 'Name', 'NamedExpr', 'Not', 'NotEq', 'Or',
    'Slice', 'Store', 'Sub', 'Subscript', 'Tuple', 'USub', 'UnaryOp', 'arg',
    'arguments', 'comprehension', 'keyword',
}


def bound_names(tree):
    """Every name the program binds: lambda parameters, walruses, comprehensions."""
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Lambda):
            args = node.args
            for arg in list(args.posonlyargs) + list(args.args) + list(args.kwonlyargs):
                names.add(arg.arg)
            if args.vararg:
                names.add(args.vararg.arg)
            if args.kwarg:
                names.add(args.kwarg.arg)
        elif isinstance(node, ast.comprehension):
            for target in ast.walk(node.target):
                if isinstance(target, ast.Name):
                    names.add(target.id)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            names.add(node.id)
    return names


def range_bound(tree):
    """Names bound by ``for <name> in range(...)``, which are integers by construction."""
    names = set()
    for node in ast.walk(tree):
        if (isinstance(node, ast.comprehension)
                and isinstance(node.target, ast.Name)
                and isinstance(node.iter, ast.Call)
                and isinstance(node.iter.func, ast.Name)
                and node.iter.func.id == 'range'):
            names.add(node.target.id)
    return names


def isinstance_int_guarded(tree):
    """Names an enclosing conditional has proved to be an int.

    Python's ``at`` emitter inlines its guard as a conditional rather than
    calling a prelude helper -- ``a[i] if isinstance(a, list) and
    isinstance(i, int) and 0 <= i < len(a) else None`` -- so the bracket read
    is safe for a reason the surrounding code states. Read that reason rather
    than exempting the shape: a name is integral here if some ``IfExp`` test in
    the program asserts ``isinstance(<name>, int)``.
    """
    names = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.IfExp):
            continue
        for test in ast.walk(node.test):
            if (isinstance(test, ast.Call)
                    and isinstance(test.func, ast.Name)
                    and test.func.id == 'isinstance'
                    and len(test.args) == 2
                    and isinstance(test.args[0], ast.Name)
                    and isinstance(test.args[1], ast.Name)
                    and test.args[1].id == 'int'):
                names.add(test.args[0].id)
    return names


def integral_index(node, integral):
    """Whether a subscript index cannot be anything but an integer or a slice of them."""
    if isinstance(node, ast.Constant):
        return isinstance(node.value, int) and not isinstance(node.value, bool)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return integral_index(node.operand, integral)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult)):
        return integral_index(node.left, integral) and integral_index(node.right, integral)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'len':
        return True
    if isinstance(node, ast.Name):
        return node.id in integral
    return False


def violations_in(code):
    found = []
    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        return [('parses', 'the emission is not valid Python: %s' % error.msg)]

    free = bound_names(tree)
    integral = range_bound(tree) | isinstance_int_guarded(tree)

    for node in ast.walk(tree):
        kind = type(node).__name__
        if kind not in ALLOWED_NODES:
            found.append(('no-unlisted-node',
                          '%s is not part of the emitted grammar' % kind))

        if isinstance(node, ast.Attribute):
            if node.attr not in ALLOWED_ATTRIBUTES:
                found.append(('no-unlisted-attribute',
                              ".%s is not in ALLOWED_ATTRIBUTES; every Python sandbox "
                              "escape is spelled with one of these" % node.attr))

        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            if node.id not in free and node.id not in ALLOWED_NAMES:
                found.append(('no-unlisted-name',
                              "'%s' is free in the emission and not in ALLOWED_NAMES"
                              % node.id))

        # A slice is not an escape vector: `obj[a:b]` on a mapping raises, and
        # on a sequence it returns a sub-sequence. Only a *key* subscript can
        # reach something it should not, so only that one is policed. (The
        # emitter slices with checker-typed Int bounds that are lambda
        # parameters, which no syntactic rule can prove integral anyway.)
        if (isinstance(node, ast.Subscript)
                and not isinstance(node.slice, ast.Slice)
                and not integral_index(node.slice, integral)):
            found.append(('no-computed-subscript',
                          'a subscript whose index is not integral by construction: %s'
                          % ast.unparse(node)[:70]))

    # Keep the order stable and drop exact duplicates, which a repeated
    # sub-expression would otherwise produce many of.
    seen, unique = set(), []
    for item in found:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


# A harness nobody has watched fail is a harness nobody knows works. Each case
# is a real escape shape, or a real emission that must stay allowed.
SELF_TEST = [
    ('reject', 'x.__class__.__bases__', 'the dunder attribute walk'),
    ('reject', '().__reduce__()', 'the reduce escape'),
    ('reject', 'eval("1+1")', 'eval'),
    ('reject', '__import__("os").system("id")', 'the import escape'),
    ('reject', 'getattr(x, "upper")', 'getattr, which turns a string into an attribute'),
    ('reject', 'open("/etc/passwd")', 'open'),
    ('reject', 'f.__globals__', 'the globals of a function'),
    ('reject', 'import os', 'an emission that is not an expression'),
    ('reject', '(lambda a, i: a[i])(xs, k)', 'an unguarded subscript: the Python at() regression'),
    ('accept', 'kAt([1, 2, 3], 0)', 'the guarded at()'),
    ('accept', '(lambda a, i: a[i] if isinstance(a, list) and isinstance(i, int) '
               'and 0 <= i < len(a) else None)([1], 0)',
     "Python's inlined at() guard, which states why its subscript is safe"),
    ('accept', '(lambda a: [x for i, x in enumerate(a) if not any(kEq(x, a[j]) '
               'for j in range(i))])([1, 2])',
     'a range-bound comprehension index'),
    ('accept', '(lambda x: "abcd"[x:x + 2])(1)',
     'a slice, which cannot reach a key however it is spelled'),
    ('accept', '(lambda _: kAssert(kEq(_dt.now().year, 2026)))(None)', 'an ordinary emission'),
    ('accept', '"abc"[1:3]', 'a constant slice'),
]


def self_test():
    failures = 0
    for expectation, code, why in SELF_TEST:
        violations = violations_in(code)
        bad = not violations if expectation == 'reject' else bool(violations)
        if bad:
            failures += 1
            print('  ✗ gate self-test: expected to %s %s' % (expectation, why),
                  file=sys.stderr)
            print('      %s' % code, file=sys.stderr)
            print('      got %r' % (violations,), file=sys.stderr)
    if failures:
        return 1
    print('Python grammar gate: %d self-tests passed' % len(SELF_TEST))
    return 0


def main(argv):
    if argv[:1] == ['--self-test']:
        return self_test()

    sources = ([('<stdin>', sys.stdin.read())] if not argv
               else [(path, open(path, encoding='utf-8').read()) for path in argv])

    failures = checked = 0
    for name, content in sources:
        # split('\n'), not splitlines(): Python's splitlines() also breaks on
        # U+2028, U+2029, \x0b, \x0c and \x85, and the emitted corpus really
        # does carry U+2028 inside a string literal (the extract-line-separator
        # fixture). Splitting there would tear one program into several and
        # report the halves as syntax errors.
        for number, line in enumerate(content.split('\n'), 1):
            if not line.strip():
                continue
            checked += 1
            for rule, detail in violations_in(line):
                failures += 1
                print('  ✗ %s:%d [%s] %s' % (name, number, rule, detail), file=sys.stderr)
                print('      %s' % line.strip()[:160], file=sys.stderr)

    if failures:
        print('Python grammar: %d emitted programs, %d violations' % (checked, failures),
              file=sys.stderr)
        return 1
    print('Python grammar: %d emitted programs, 0 violations' % checked)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
