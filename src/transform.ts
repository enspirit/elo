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
  irObject,
  irVariable,
  irCall,
  irApply,
  irLet,
  irMemberAccess,
  irIf,
  irLambda,
  irPredicate,
  inferType,
} from './ir';
import { EloType, Types } from './types';
import { eloTypeDefs } from './typedefs';

/**
 * Type environment: maps variable names to their inferred types
 */
export type TypeEnv = Map<string, EloType>;

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

    case 'lambda':
      return transformLambda(expr.params, expr.body, env);

    case 'predicate':
      return transformPredicate(expr.params, expr.body, env);

    case 'object':
      return irObject(
        expr.properties.map((prop) => ({
          key: prop.key,
          value: transform(prop.value, env),
        }))
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
  const resultType = eloTypeDefs.lookup(fn, [leftType, rightType]);

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
function transformFunctionCall(name: string, args: Expr[], env: TypeEnv): IRExpr {
  const argsIR = args.map((arg) => transform(arg, env));
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
 * Transform a lambda expression
 */
function transformLambda(params: string[], body: Expr, env: TypeEnv): IRExpr {
  // Build a new environment with params as 'any' type
  const newEnv = new Map(env);
  const irParams = params.map((name) => {
    newEnv.set(name, Types.any);
    return { name, inferredType: Types.any };
  });

  const bodyIR = transform(body, newEnv);
  const resultType = inferType(bodyIR);
  return irLambda(irParams, bodyIR, resultType);
}

/**
 * Transform a predicate expression
 */
function transformPredicate(params: string[], body: Expr, env: TypeEnv): IRExpr {
  // Build a new environment with params as 'any' type
  const newEnv = new Map(env);
  const irParams = params.map((name) => {
    newEnv.set(name, Types.any);
    return { name, inferredType: Types.any };
  });

  const bodyIR = transform(body, newEnv);
  return irPredicate(irParams, bodyIR);
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
