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
  irInt,
  irFloat,
  irBool,
  irString,
  irDate,
  irDateTime,
  irDuration,
  irVariable,
  irCall,
  irLet,
  irMemberAccess,
  irIf,
  inferType,
} from './ir';
import { KlangType, Types } from './types';
import { klangTypeDefs } from './typedefs';

/**
 * Type environment: maps variable names to their inferred types
 */
export type TypeEnv = Map<string, KlangType>;

/**
 * Transform an AST expression into IR
 */
export function transform(expr: Expr, env: TypeEnv = new Map()): IRExpr {
  switch (expr.type) {
    case 'literal':
      return transformLiteral(expr.value);

    case 'string':
      return irString(expr.value);

    case 'date':
      return irDate(expr.value);

    case 'datetime':
      return irDateTime(expr.value);

    case 'duration':
      return irDuration(expr.value);

    case 'variable':
      return irVariable(expr.name, env.get(expr.name) ?? Types.any);

    case 'binary':
      return transformBinaryOp(expr.operator, expr.left, expr.right, env);

    case 'unary':
      return transformUnaryOp(expr.operator, expr.operand, env);

    case 'temporal_keyword':
      return transformTemporalKeyword(expr.keyword);

    case 'function_call':
      return transformFunctionCall(expr.name, expr.args, env);

    case 'member_access':
      return irMemberAccess(transform(expr.object, env), expr.property);

    case 'let':
      return transformLet(expr.bindings, expr.body, env);

    case 'if':
      return irIf(
        transform(expr.condition, env),
        transform(expr.then, env),
        transform(expr.else, env)
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
  env: TypeEnv
): IRExpr {
  const leftIR = transform(left, env);
  const rightIR = transform(right, env);
  const leftType = inferType(leftIR);
  const rightType = inferType(rightIR);

  const fn = opNameMap[operator];
  if (!fn) {
    throw new Error(`Unknown binary operator: ${operator}`);
  }
  const resultType = klangTypeDefs.lookup(fn, [leftType, rightType]);

  return irCall(fn, [leftIR, rightIR], [leftType, rightType], resultType);
}

/**
 * Transform a unary operator into a typed function call
 */
function transformUnaryOp(operator: string, operand: Expr, env: TypeEnv): IRExpr {
  const operandIR = transform(operand, env);
  const operandType = inferType(operandIR);

  const fn = unaryOpNameMap[operator];
  if (!fn) {
    throw new Error(`Unknown unary operator: ${operator}`);
  }
  const resultType = klangTypeDefs.lookup(fn, [operandType]);

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

    default:
      throw new Error(`Unknown temporal keyword: ${keyword}`);
  }
}

/**
 * Transform a function call
 */
function transformFunctionCall(name: string, args: Expr[], env: TypeEnv): IRExpr {
  const argsIR = args.map((arg) => transform(arg, env));
  const argTypes = argsIR.map(inferType);
  const resultType = klangTypeDefs.lookup(name, argTypes);
  return irCall(name, argsIR, argTypes, resultType);
}

/**
 * Transform a let expression
 */
function transformLet(
  bindings: Array<{ name: string; value: Expr }>,
  body: Expr,
  env: TypeEnv
): IRExpr {
  // Build a new environment with the bindings
  const newEnv = new Map(env);
  const irBindings = bindings.map((binding) => {
    const valueIR = transform(binding.value, newEnv);
    const valueType = inferType(valueIR);
    newEnv.set(binding.name, valueType);
    return { name: binding.name, value: valueIR };
  });

  const bodyIR = transform(body, newEnv);
  return irLet(irBindings, bodyIR);
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
