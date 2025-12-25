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
  inferType,
} from './ir';
import { KlangType, Types, typeName } from './types';

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

  const fn = resolveBinaryOp(operator, leftType, rightType);
  const resultType = inferBinaryResultType(operator, leftType, rightType);

  return irCall(fn, [leftIR, rightIR], resultType);
}

/**
 * Transform a unary operator into a typed function call
 */
function transformUnaryOp(operator: string, operand: Expr, env: TypeEnv): IRExpr {
  const operandIR = transform(operand, env);
  const operandType = inferType(operandIR);

  const fn = resolveUnaryOp(operator, operandType);
  const resultType = inferUnaryResultType(operator, operandType);

  return irCall(fn, [operandIR], resultType);
}

/**
 * Transform a temporal keyword into a function call
 */
function transformTemporalKeyword(keyword: string): IRExpr {
  switch (keyword) {
    case 'TODAY':
      return irCall('today', [], Types.date);

    case 'NOW':
      return irCall('now', [], Types.datetime);

    case 'TOMORROW':
      return irCall(
        'add_date_duration',
        [irCall('today', [], Types.date), irDuration('P1D')],
        Types.date
      );

    case 'YESTERDAY':
      return irCall(
        'sub_date_duration',
        [irCall('today', [], Types.date), irDuration('P1D')],
        Types.date
      );

    case 'SOD':
      return irCall(
        'start_of_day',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'EOD':
      return irCall(
        'end_of_day',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'SOW':
      return irCall(
        'start_of_week',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'EOW':
      return irCall(
        'end_of_week',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'SOM':
      return irCall(
        'start_of_month',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'EOM':
      return irCall(
        'end_of_month',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'SOQ':
      return irCall(
        'start_of_quarter',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'EOQ':
      return irCall(
        'end_of_quarter',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'SOY':
      return irCall(
        'start_of_year',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    case 'EOY':
      return irCall(
        'end_of_year',
        [irCall('now', [], Types.datetime)],
        Types.datetime
      );

    default:
      throw new Error(`Unknown temporal keyword: ${keyword}`);
  }
}

/**
 * Transform a function call
 */
function transformFunctionCall(name: string, args: Expr[], env: TypeEnv): IRExpr {
  const argsIR = args.map((arg) => transform(arg, env));
  // For now, function calls have unknown result type
  return irCall(name, argsIR, Types.any);
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

/**
 * Resolve a binary operator to a function name based on operand types
 */
function resolveBinaryOp(op: string, left: KlangType, right: KlangType): string {
  const opName = opNameMap[op];
  if (!opName) {
    throw new Error(`Unknown binary operator: ${op}`);
  }

  const leftName = typeName(left);
  const rightName = typeName(right);

  // Return typed function name
  return `${opName}_${leftName}_${rightName}`;
}

/**
 * Resolve a unary operator to a function name based on operand type
 */
function resolveUnaryOp(op: string, operand: KlangType): string {
  const opName = unaryOpNameMap[op];
  if (!opName) {
    throw new Error(`Unknown unary operator: ${op}`);
  }

  return `${opName}_${typeName(operand)}`;
}

/**
 * Infer the result type of a binary operation
 */
function inferBinaryResultType(op: string, left: KlangType, right: KlangType): KlangType {
  // If either operand is unknown, result is unknown
  if (left.kind === 'any' || right.kind === 'any') {
    return Types.any;
  }

  // Comparison operators always return bool
  if (['<', '>', '<=', '>=', '==', '!='].includes(op)) {
    return Types.bool;
  }

  // Logical operators always return bool
  if (['&&', '||'].includes(op)) {
    return Types.bool;
  }

  // Arithmetic with same numeric types
  if (['+', '-', '*', '/', '%', '^'].includes(op)) {
    // int op int -> int (except division)
    if (left.kind === 'int' && right.kind === 'int') {
      return op === '/' ? Types.float : Types.int;
    }

    // duration * number -> duration (scaling) - check before float catch-all
    if (left.kind === 'duration' && (right.kind === 'int' || right.kind === 'float') && op === '*') {
      return Types.duration;
    }
    if ((left.kind === 'int' || left.kind === 'float') && right.kind === 'duration' && op === '*') {
      return Types.duration;
    }

    // duration / number -> duration (scaling) - check before float catch-all
    if (left.kind === 'duration' && (right.kind === 'int' || right.kind === 'float') && op === '/') {
      return Types.duration;
    }

    // float involved -> float
    if (left.kind === 'float' || right.kind === 'float') {
      return Types.float;
    }

    // date + duration -> date
    if (left.kind === 'date' && right.kind === 'duration') {
      return Types.date;
    }

    // date - duration -> date
    if (left.kind === 'date' && right.kind === 'duration') {
      return Types.date;
    }

    // datetime + duration -> datetime
    if (left.kind === 'datetime' && right.kind === 'duration') {
      return Types.datetime;
    }

    // datetime - duration -> datetime
    if (left.kind === 'datetime' && right.kind === 'duration') {
      return Types.datetime;
    }

    // duration + duration -> duration
    if (left.kind === 'duration' && right.kind === 'duration') {
      return Types.duration;
    }

    // date - date -> duration (difference)
    if (left.kind === 'date' && right.kind === 'date' && op === '-') {
      return Types.duration;
    }

    // string + string -> string (concatenation)
    if (left.kind === 'string' && right.kind === 'string' && op === '+') {
      return Types.string;
    }
  }

  // Fallback to any
  return Types.any;
}

/**
 * Infer the result type of a unary operation
 */
function inferUnaryResultType(op: string, operand: KlangType): KlangType {
  if (operand.kind === 'any') {
    return Types.any;
  }

  switch (op) {
    case '-':
    case '+':
      // Preserves numeric type
      if (operand.kind === 'int') return Types.int;
      if (operand.kind === 'float') return Types.float;
      return Types.any;

    case '!':
      return Types.bool;

    default:
      return Types.any;
  }
}
