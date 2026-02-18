/**
 * AST to IR transformation
 *
 * Transforms the parsed AST into a typed intermediate representation.
 * This phase:
 * - Assigns types to literals
 * - Rewrites operators as typed function calls
 * - Rewrites temporal keywords as function calls
 * - Tracks variable types through let bindings
 */

import { Expr } from './ast';
import {
  IRExpr,
  IRTypeExpr,
  irInt,
  irFloat,
  irBool,
  irNull,
  irString,
  irDate,
  irDateTime,
  irDuration,
  irObject,
  irArray,
  irVariable,
  irCall,
  irApply,
  irLet,
  irMemberAccess,
  irIf,
  irLambda,
  irAlternative,
  irDataPath,
  irTypeDef,
  irTypeRef,
  irTypeSchema,
  irSubtypeConstraint,
  irArrayType,
  irUnionType,
  irGuard,
  inferType,
} from './ir';
import { TypeExpr } from './ast';
import { EloType, Types, TypeKind } from './types';
import { eloTypeDefs } from './typedefs';

/**
 * Type environment: maps variable names to their inferred types
 */
export type TypeEnv = Map<string, EloType>;

/**
 * Set of function names currently being defined (to detect recursion)
 */
type DefiningSet = Set<string>;

/**
 * Options for the transform function
 */
export interface TransformOptions {
  maxDepth?: number;
  /**
   * If true, allow undefined variables (for SQL where they represent column names).
   * If false (default), undefined variables throw an error to prevent access to host globals.
   */
  allowUndefinedVariables?: boolean;
}

const DEFAULT_MAX_DEPTH = 100;

/**
 * Transform an AST expression into IR
 */
export function transform(
  expr: Expr,
  env: TypeEnv = new Map(),
  defining: DefiningSet = new Set(),
  options: TransformOptions = {}
): IRExpr {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const allowUndefinedVariables = options.allowUndefinedVariables ?? false;
  return transformWithDepth(expr, env, defining, 0, maxDepth, allowUndefinedVariables);
}

/**
 * Internal transform function that tracks depth
 */
function transformWithDepth(
  expr: Expr,
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  if (depth > maxDepth) {
    throw new Error(`Maximum transform depth exceeded (${maxDepth})`);
  }
  const nextDepth = depth + 1;
  const recurse = (e: Expr, newEnv: TypeEnv = env, newDefining: DefiningSet = defining) =>
    transformWithDepth(e, newEnv, newDefining, nextDepth, maxDepth, allowUndefinedVariables);

  switch (expr.type) {
    case 'literal':
      return transformLiteral(expr.value);

    case 'string':
      return irString(expr.value);

    case 'null':
      return irNull();

    case 'date':
      return irDate(expr.value);

    case 'datetime':
      return irDateTime(expr.value);

    case 'duration':
      return irDuration(expr.value);

    case 'variable':
      // Allow _ (input variable) and variables defined in scope
      // Reject undefined variables to prevent access to host globals (unless allowUndefinedVariables is set)
      if (!allowUndefinedVariables && expr.name !== '_' && !env.has(expr.name)) {
        throw new Error(`Undefined variable: '${expr.name}'`);
      }
      return irVariable(expr.name, env.get(expr.name) ?? Types.any);

    case 'binary':
      return transformBinaryOp(expr.operator, expr.left, expr.right, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'unary':
      return transformUnaryOp(expr.operator, expr.operand, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'temporal_keyword':
      return transformTemporalKeyword(expr.keyword);

    case 'function_call':
      return transformFunctionCall(expr.name, expr.args, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'member_access': {
      const objectIR = recurse(expr.object);
      const objectType = inferType(objectIR);

      // Only allow member access on data types (any, object, array)
      // This prevents exposing runtime internals like Luxon DateTime/Duration methods
      const allowedTypes: TypeKind[] = ['any', 'object', 'array'];
      if (!allowedTypes.includes(objectType.kind)) {
        throw new Error(
          `Member access '.${expr.property}' is not allowed on ${objectType.kind} type. ` +
          `Use stdlib functions instead (e.g., 'start(interval)' not 'interval.start').`
        );
      }

      return irMemberAccess(objectIR, expr.property);
    }

    case 'let':
      return transformLet(expr.bindings, expr.body, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'if':
      return irIf(
        recurse(expr.condition),
        recurse(expr.then),
        recurse(expr.else)
      );

    case 'lambda':
      return transformLambda(expr.params, expr.body, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'object':
      return irObject(
        expr.properties.map((prop) => ({
          key: prop.key,
          value: recurse(prop.value),
        }))
      );

    case 'array':
      return irArray(expr.elements.map((el) => recurse(el)));

    case 'alternative':
      return transformAlternative(expr.alternatives, env, defining, nextDepth, maxDepth, allowUndefinedVariables);

    case 'apply': {
      const fnIR = recurse(expr.fn);
      const argsIR = expr.args.map((arg) => recurse(arg));
      const argTypes = argsIR.map(inferType);

      // Reject method-call syntax on member access unless it's a function stored in data
      // This prevents calling runtime methods like DateTime.diff() or String.toUpperCase()
      if (fnIR.type === 'member_access') {
        const objectType = inferType(fnIR.object);
        const allowedTypes: TypeKind[] = ['any', 'object', 'array'];
        if (!allowedTypes.includes(objectType.kind)) {
          throw new Error(
            `Method call '.${fnIR.property}(...)' is not allowed on ${objectType.kind} type. ` +
            `Use stdlib functions instead.`
          );
        }
      }

      return irApply(fnIR, argsIR, argTypes, Types.any);
    }

    case 'datapath':
      return irDataPath(expr.segments);

    case 'typedef': {
      // Transform type definition
      const irTypeExpr = transformTypeExprWithContext(expr.typeExpr, env, defining, nextDepth, maxDepth, allowUndefinedVariables);
      // Add type name to environment as a parser function type
      const newEnv = new Map(env);
      newEnv.set(expr.name, Types.fn);
      const bodyIR = transformWithDepth(expr.body, newEnv, defining, nextDepth, maxDepth, allowUndefinedVariables);
      return irTypeDef(expr.name, irTypeExpr, bodyIR);
    }

    case 'guard': {
      // Transform guard expression
      const constraintsIR = expr.constraints.map(c => ({
        label: c.label,
        condition: recurse(c.condition)
      }));
      const bodyIR = recurse(expr.body);
      return irGuard(constraintsIR, bodyIR, expr.guardType);
    }
  }
}

/**
 * Built-in type selectors that can be used in type expressions
 */
const BUILTIN_TYPE_SELECTORS = new Set([
  'Any',
  'Null',
  'String',
  'Int',
  'Float',
  'Bool',
  'Boolean',
  'Datetime',
  'Interval',
]);

/**
 * Transform an AST type expression to IR type expression
 */
function transformTypeExprWithContext(
  typeExpr: TypeExpr,
  env: TypeEnv,
  defining: Set<string>,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRTypeExpr {
  switch (typeExpr.kind) {
    case 'type_ref': {
      const name = typeExpr.name;
      // Validate that the type reference is either a built-in type or a user-defined type in scope
      if (!BUILTIN_TYPE_SELECTORS.has(name)) {
        // Check if it's a user-defined type (uppercase identifier in environment as function type)
        const envType = env.get(name);
        if (!envType || envType.kind !== 'fn') {
          throw new Error(`Unknown type selector: '${name}'`);
        }
      }
      return irTypeRef(name);
    }

    case 'type_schema': {
      const props = typeExpr.properties.map(prop => ({
        key: prop.key,
        typeExpr: transformTypeExprWithContext(prop.typeExpr, env, defining, depth, maxDepth, allowUndefinedVariables),
        optional: prop.optional,
      }));
      // Transform extras if it's a TypeExpr, otherwise pass through as-is
      let extras: 'closed' | 'ignored' | IRTypeExpr | undefined;
      if (typeExpr.extras === 'closed' || typeExpr.extras === 'ignored' || typeExpr.extras === undefined) {
        extras = typeExpr.extras;
      } else {
        extras = transformTypeExprWithContext(typeExpr.extras, env, defining, depth, maxDepth, allowUndefinedVariables);
      }
      return irTypeSchema(props, extras);
    }

    case 'subtype_constraint': {
      // Transform the base type
      const baseTypeIR = transformTypeExprWithContext(typeExpr.baseType, env, defining, depth, maxDepth, allowUndefinedVariables);
      // Transform each constraint with the variable in scope
      const constraintEnv = new Map(env);
      constraintEnv.set(typeExpr.variable, Types.any);
      const constraintsIR = typeExpr.constraints.map(c => ({
        label: c.label,
        condition: transformWithDepth(c.condition, constraintEnv, defining, depth, maxDepth, allowUndefinedVariables)
      }));
      return irSubtypeConstraint(baseTypeIR, typeExpr.variable, constraintsIR);
    }

    case 'array_type':
      return irArrayType(
        transformTypeExprWithContext(typeExpr.elementType, env, defining, depth, maxDepth, allowUndefinedVariables)
      );

    case 'union_type':
      return irUnionType(
        typeExpr.types.map(t => transformTypeExprWithContext(t, env, defining, depth, maxDepth, allowUndefinedVariables))
      );
  }
}

/**
 * Transform a literal value (number or boolean)
 */
function transformLiteral(value: number | boolean): IRExpr {
  if (typeof value === 'boolean') {
    return irBool(value);
  }
  // Distinguish int from float
  if (Number.isInteger(value)) {
    return irInt(value);
  }
  return irFloat(value);
}

/**
 * Transform a binary operator into a typed function call
 */
function transformBinaryOp(
  operator: string,
  left: Expr,
  right: Expr,
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  const leftIR = transformWithDepth(left, env, defining, depth, maxDepth, allowUndefinedVariables);
  const rightIR = transformWithDepth(right, env, defining, depth, maxDepth, allowUndefinedVariables);
  const leftType = inferType(leftIR);
  const rightType = inferType(rightIR);

  const fn = opNameMap[operator];
  if (!fn) {
    throw new Error(`Unknown binary operator: ${operator}`);
  }
  const resultType = eloTypeDefs.lookup(fn, [leftType, rightType]);

  return irCall(fn, [leftIR, rightIR], [leftType, rightType], resultType);
}

/**
 * Transform a unary operator into a typed function call
 */
function transformUnaryOp(
  operator: string,
  operand: Expr,
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  const operandIR = transformWithDepth(operand, env, defining, depth, maxDepth, allowUndefinedVariables);
  const operandType = inferType(operandIR);

  const fn = unaryOpNameMap[operator];
  if (!fn) {
    throw new Error(`Unknown unary operator: ${operator}`);
  }
  const resultType = eloTypeDefs.lookup(fn, [operandType]);

  return irCall(fn, [operandIR], [operandType], resultType);
}

/**
 * Transform a temporal keyword into a function call
 */
function transformTemporalKeyword(keyword: string): IRExpr {
  const today = () => irCall('today', [], [], Types.date);
  const now = () => irCall('now', [], [], Types.datetime);

  switch (keyword) {
    case 'TODAY':
      return today();

    case 'NOW':
      return now();

    case 'TOMORROW':
      return irCall('add', [today(), irDuration('P1D')], [Types.date, Types.duration], Types.date);

    case 'YESTERDAY':
      return irCall('sub', [today(), irDuration('P1D')], [Types.date, Types.duration], Types.date);

    case 'SOD':
      return irCall('start_of_day', [now()], [Types.datetime], Types.datetime);

    case 'EOD':
      return irCall('end_of_day', [now()], [Types.datetime], Types.datetime);

    case 'SOW':
      return irCall('start_of_week', [now()], [Types.datetime], Types.datetime);

    case 'EOW':
      return irCall('end_of_week', [now()], [Types.datetime], Types.datetime);

    case 'SOM':
      return irCall('start_of_month', [now()], [Types.datetime], Types.datetime);

    case 'EOM':
      return irCall('end_of_month', [now()], [Types.datetime], Types.datetime);

    case 'SOQ':
      return irCall('start_of_quarter', [now()], [Types.datetime], Types.datetime);

    case 'EOQ':
      return irCall('end_of_quarter', [now()], [Types.datetime], Types.datetime);

    case 'SOY':
      return irCall('start_of_year', [now()], [Types.datetime], Types.datetime);

    case 'EOY':
      return irCall('end_of_year', [now()], [Types.datetime], Types.datetime);

    case 'BOT':
      return irCall('bot', [], [], Types.datetime);

    case 'EOT':
      return irCall('eot', [], [], Types.datetime);

    default:
      throw new Error(`Unknown temporal keyword: ${keyword}`);
  }
}

/**
 * Transform a function call
 *
 * If the function name is a variable in the environment (i.e., a lambda),
 * we emit an 'apply' node. Otherwise, we emit a 'call' to the stdlib.
 */
function transformFunctionCall(
  name: string,
  args: Expr[],
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  // Check for recursive call
  if (defining.has(name)) {
    throw new Error(`Recursive function calls are not allowed: '${name}' cannot call itself`);
  }

  const argsIR = args.map((arg) => transformWithDepth(arg, env, defining, depth, maxDepth, allowUndefinedVariables));
  const argTypes = argsIR.map(inferType);

  // Check if the name is a variable holding a lambda
  const varType = env.get(name);
  if (varType && varType.kind === 'fn') {
    // Lambda application: emit irApply
    const fnVar = irVariable(name, varType);
    return irApply(fnVar, argsIR, argTypes, Types.any);
  }

  // stdlib function call
  const resultType = eloTypeDefs.lookup(name, argTypes);
  return irCall(name, argsIR, argTypes, resultType);
}

/**
 * Transform a let expression
 */
function transformLet(
  bindings: Array<{ name: string; value: Expr }>,
  body: Expr,
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  // Build a new environment with the bindings
  const newEnv = new Map(env);
  const irBindings = bindings.map((binding) => {
    // If the value is a lambda, add the binding name to the defining set
    // to detect recursive calls within the lambda body
    const isLambda = binding.value.type === 'lambda';
    const newDefining = isLambda ? new Set([...defining, binding.name]) : defining;

    const valueIR = transformWithDepth(binding.value, newEnv, newDefining, depth, maxDepth, allowUndefinedVariables);
    const valueType = inferType(valueIR);
    newEnv.set(binding.name, valueType);
    return { name: binding.name, value: valueIR };
  });

  const bodyIR = transformWithDepth(body, newEnv, defining, depth, maxDepth, allowUndefinedVariables);
  return irLet(irBindings, bodyIR);
}

/**
 * Transform a lambda expression
 */
function transformLambda(
  params: string[],
  body: Expr,
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  // Build a new environment with params as 'any' type
  const newEnv = new Map(env);
  const irParams = params.map((name) => {
    newEnv.set(name, Types.any);
    return { name, inferredType: Types.any };
  });

  const bodyIR = transformWithDepth(body, newEnv, defining, depth, maxDepth, allowUndefinedVariables);
  const resultType = inferType(bodyIR);
  return irLambda(irParams, bodyIR, resultType);
}

/**
 * Transform an alternative expression: a | b | c
 *
 * The result type is inferred as:
 * - If all alternatives have the same type, that type
 * - Otherwise, 'any'
 */
function transformAlternative(
  alternatives: Expr[],
  env: TypeEnv,
  defining: DefiningSet,
  depth: number,
  maxDepth: number,
  allowUndefinedVariables: boolean
): IRExpr {
  const irAlts = alternatives.map((alt) =>
    transformWithDepth(alt, env, defining, depth, maxDepth, allowUndefinedVariables)
  );

  // Infer result type: if first alternative is any, result is any (runtime value is opaque).
  // Otherwise, use first non-any type, or any if all are any.
  const firstType = inferType(irAlts[0]);
  let resultType: EloType = firstType;
  if (firstType.kind === 'any') {
    // First alternative is any, result must be any (we can't assume fallback types)
    resultType = Types.any;
  } else {
    // Use first non-any type
    for (const alt of irAlts) {
      const altType = inferType(alt);
      if (altType.kind !== 'any') {
        resultType = altType;
        break;
      }
    }
  }

  return irAlternative(irAlts, resultType);
}

/**
 * Map operator symbols to function name prefixes
 */
const opNameMap: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '%': 'mod',
  '^': 'pow',
  '<': 'lt',
  '>': 'gt',
  '<=': 'lte',
  '>=': 'gte',
  '==': 'eq',
  '!=': 'neq',
  '&&': 'and',
  '||': 'or',
};

const unaryOpNameMap: Record<string, string> = {
  '-': 'neg',
  '+': 'pos',
  '!': 'not',
};
