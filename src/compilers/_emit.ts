/**
 * The walk from IR to target code, written once.
 *
 * Each target used to walk the IR itself, so the same 21 node kinds were
 * visited in the same order in four files — 677 lines of it — with the
 * target-specific part already factored out into `bindings/*.ts`. What was
 * duplicated was the recursion, which has no target in it.
 *
 * That duplication cost correctness rather than only length: every feature
 * touching emission had to be added four times, and the record shows it was
 * not. The failure kind and label added by 0202 landed on JavaScript alone.
 *
 * So a target is now an {@link Emitter}: flat data and plain functions, one per
 * node kind, each handed its children **already emitted**. No inheritance, no
 * overridable hooks, no base class. A target file stays readable top to bottom
 * and answers "what does Ruby emit for a lambda" in one line.
 *
 * Some cases are handed the node as well, for what the emitted children cannot
 * say: whether the object of a member read was a call (so it needs parens),
 * whether the callee of an apply was a lambda, the element type SQL casts an
 * empty array to, and the Elo type of each branch of an alternative, which
 * COALESCE needs because it takes one type where Elo does not. None of those
 * re-emit anything; they read a flag.
 *
 * Exactly one case re-emits a subexpression of its own: SQL's `member_access`,
 * where a chain `a.b.c` collapses into a single `#>>` read against a json root
 * that is not `ir.object`, so there is no child to pre-emit. It takes `ctx` for
 * that. If that ever becomes ten cases, this abstraction is the wrong one.
 */

import { locate } from '../ast';
import {
  IRAlternative,
  IRApply,
  IRArrayLiteral,
  IRExpr,
  IRMemberAccess,
  IRObjectLiteral,
  IRTypeExpr,
} from '../ir';
import { EmitContext, StdLib } from '../stdlib';
import { assertNumericLiteral, formatFloatLiteral } from './_validate';

/** One `let` binding, its value already emitted. */
export interface EmittedBinding {
  name: string;
  value: string;
}

/** One object property, its value already emitted. */
export interface EmittedProperty {
  key: string;
  value: string;
}

/** One type definition of a `typedef`, its parser already emitted. */
export interface EmittedDefinition {
  name: string;
  parser: string;
}

/** One constraint of a `guard` or `check`, its condition already emitted. */
export interface EmittedConstraint {
  label?: string;
  condition: string;
  /**
   * What to say when it does not hold. Built here rather than per target: the
   * wording is the same in all of them, and a label written as a sentence *is*
   * the message — that is how an author replaces Elo's prose with their own.
   */
  message: string;
}

/** One branch of an `alternative`, emitted and with the node it came from. */
export interface EmittedAlternative {
  code: string;
  node: IRExpr;
}

/** How a target spells each kind of IR node. */
export interface Emitter {
  /** The stdlib binding: how a `call` is emitted, by name and argument types. */
  lib: StdLib<string>;

  /**
   * Whether a child needs parentheses inside a native binary operator.
   * Target-specific because the precedence tables are.
   */
  needsParens(child: IRExpr, parentOp: string, side: 'left' | 'right'): boolean;

  boolLiteral(value: boolean): string;
  nullLiteral: string;
  stringLiteral(value: string): string;
  dateLiteral(value: string): string;
  datetimeLiteral(value: string): string;
  durationLiteral(value: string): string;

  objectLiteral(properties: EmittedProperty[]): string;
  arrayLiteral(elements: string[], ir: IRArrayLiteral, ctx: EmitContext<string>): string;
  variable(name: string): string;
  memberAccess(object: string, property: string, ir: IRMemberAccess, ctx: EmitContext<string>): string;

  /**
   * A `let`, its bindings flattened. A chain of them is one scope: the walk
   * collects it, so a target says how one scope is spelled and not how a chain
   * is unnested. A binding that shadows another cannot arrive here — the
   * transform emits it under a name of its own.
   */
  letExpr(bindings: EmittedBinding[], body: string): string;

  ifExpr(condition: string, then: string, otherwise: string): string;
  /** A lambda. Absent when the target has none — SQL. */
  lambda?(params: string[], body: string): string;
  /** Applying one. Absent when the target has none — SQL. */
  apply?(fn: string, args: string[], ir: IRApply): string;
  alternative(alternatives: EmittedAlternative[], ir: IRAlternative, ctx: EmitContext<string>): string;
  datapath(segments: Array<string | number>): string;

  /** A type definition. Absent when the target has none — SQL. */
  typedef?(definitions: EmittedDefinition[], body: string, ctx: EmitContext<string>): string;
  /** A parser for one type expression, for `typedef` to bind. */
  typeParser?(typeExpr: IRTypeExpr, ctx: EmitContext<string>): string;
  /** A `guard` or `check`. Absent when the target has none — SQL. */
  guard?(constraints: EmittedConstraint[], body: string, guardType: 'guard' | 'check', ctx: EmitContext<string>): string;

  /** What to say when the target cannot express a node at all. */
  unsupported: Partial<Record<IRExpr['type'], string>>;
}

/** What the walk is told about the run, as opposed to about the target. */
export interface WalkOptions {
  /** Drop `guard`/`check` assertions, for `--strip-guards`. */
  stripGuards: boolean;
}

/**
 * Emit `ir` for `emitter`, collecting the helpers it needs along the way.
 */
export function emit(
  ir: IRExpr,
  emitter: Emitter,
  options: WalkOptions,
  requiredHelpers: Set<string>
): string {
  // The position travels with the node, so a refusal — a signature the target
  // has no implementation of, a list SQL cannot hold — says where in the
  // source it is about. Positioned here rather than at each throw site:
  // emission is a recursion, so the node in hand is always the piece of source
  // the refusal is about, and a refusal added later is positioned the same way.
  try {
    return emitNode(ir, emitter, options, requiredHelpers);
  } catch (error) {
    throw locate(error, ir.loc);
  }
}

function emitNode(
  ir: IRExpr,
  emitter: Emitter,
  options: WalkOptions,
  requiredHelpers: Set<string>
): string {
  const recurse = (child: IRExpr) => emit(child, emitter, options, requiredHelpers);

  const ctx: EmitContext<string> = {
    emit: recurse,
    emitWithParens: (child, parentOp, side) => {
      const emitted = recurse(child);
      return emitter.needsParens(child, parentOp, side) ? `(${emitted})` : emitted;
    },
    requireHelper: (name) => requiredHelpers.add(name),
  };

  const refuse = (): never => {
    throw new Error(emitter.unsupported[ir.type] ?? `${ir.type} is not supported by this target`);
  };

  switch (ir.type) {
    // Numbers are spelled the same by every target, down to how a float that
    // happens to be integral is written.
    case 'int_literal':
      return assertNumericLiteral(ir.value).toString();

    case 'float_literal':
      return formatFloatLiteral(ir.value);

    case 'bool_literal':
      return emitter.boolLiteral(ir.value);

    case 'null_literal':
      return emitter.nullLiteral;

    case 'string_literal':
      return emitter.stringLiteral(ir.value);

    case 'date_literal':
      return emitter.dateLiteral(ir.value);

    case 'datetime_literal':
      return emitter.datetimeLiteral(ir.value);

    case 'duration_literal':
      return emitter.durationLiteral(ir.value);

    case 'object_literal':
      return emitter.objectLiteral(
        (ir as IRObjectLiteral).properties.map(p => ({ key: p.key, value: recurse(p.value) }))
      );

    case 'array_literal':
      return emitter.arrayLiteral(ir.elements.map(recurse), ir, ctx);

    case 'variable':
      return emitter.variable(ir.name);

    case 'member_access':
      return emitter.memberAccess(recurse(ir.object), ir.property, ir, ctx);

    case 'let': {
      // A chain of `let`s is one scope. Collected here so that a target says
      // how one scope is spelled rather than how a chain is unnested — SQL
      // nests it, the other three emit a flat sequence, and both come out the
      // same whether the chain was one node or ten.
      const bindings: EmittedBinding[] = [];
      let current: IRExpr = ir;
      while (current.type === 'let') {
        for (const binding of current.bindings) {
          bindings.push({ name: binding.name, value: recurse(binding.value) });
        }
        current = current.body;
      }
      return emitter.letExpr(bindings, recurse(current));
    }

    case 'call':
      return emitter.lib.emit(ir.fn, ir.args, ir.argTypes, ctx);

    case 'if':
      return emitter.ifExpr(recurse(ir.condition), recurse(ir.then), recurse(ir.else));

    case 'lambda':
      if (!emitter.lambda) return refuse();
      return emitter.lambda(ir.params.map(p => p.name), recurse(ir.body));

    case 'apply':
      if (!emitter.apply) return refuse();
      return emitter.apply(recurse(ir.fn), ir.args.map(recurse), ir);

    case 'alternative':
      return emitter.alternative(
        ir.alternatives.map(node => ({ code: recurse(node), node })),
        ir as IRAlternative,
        ctx
      );

    case 'datapath':
      return emitter.datapath(ir.segments);

    case 'typedef': {
      if (!emitter.typedef || !emitter.typeParser) return refuse();
      const typeParser = emitter.typeParser;
      const definitions = ir.definitions.map(definition => ({
        name: definition.name,
        parser: typeParser(definition.typeExpr, ctx),
      }));
      return emitter.typedef(definitions, recurse(ir.body), ctx);
    }

    case 'guard': {
      const body = recurse(ir.body);
      if (options.stripGuards) return body;
      if (!emitter.guard) return refuse();
      const constraints = ir.constraints.map(c => ({
        label: c.label,
        condition: recurse(c.condition),
        message: constraintMessage(ir.guardType, c.label),
      }));
      return emitter.guard(constraints, body, ir.guardType, ctx);
    }
  }
}

/**
 * What a failed `guard`, `check` or constraint says.
 *
 * One wording for every target. A label holding a space is taken as the whole
 * message, which is how an author replaces Elo's prose with their own.
 */
export function constraintMessage(what: string, label?: string): string {
  if (!label) return `${what} failed`;
  return label.includes(' ') ? label : `${what} '${label}' failed`;
}

/**
 * The helpers an emission needs, with their dependencies pulled in, sorted so
 * that the same expression always emits the same bytes.
 */
export function resolveHelpers(
  required: Set<string>,
  deps: Record<string, string[]>
): string[] {
  const all = new Set(required);
  for (const helper of required) {
    for (const dep of deps[helper] ?? []) {
      all.add(dep);
    }
  }
  return [...all].sort();
}
