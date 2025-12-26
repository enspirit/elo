import { Expr, literal, stringLiteral, variable, binary, unary, dateLiteral, dateTimeLiteral, durationLiteral, temporalKeyword, functionCall, memberAccess, letExpr, ifExpr, lambda, predicate, LetBinding, objectLiteral, ObjectProperty } from './ast';

/**
 * Token types
 */
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'DATE'
  | 'DATETIME'
  | 'DURATION'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'CARET'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'COMMA'
  | 'COLON'
  | 'DOT'
  | 'PIPE'
  | 'PIPE_OP'
  | 'ARROW'
  | 'RANGE_INCL'
  | 'RANGE_EXCL'
  | 'LT'
  | 'GT'
  | 'LTE'
  | 'GTE'
  | 'EQ'
  | 'NEQ'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LET'
  | 'IN'
  | 'IF'
  | 'THEN'
  | 'ELSE'
  | 'FN'
  | 'ASSIGN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenizer for arithmetic expressions
 */
interface LexerState {
  position: number;
  current: string;
}

class Lexer {
  private input: string;
  private position: number = 0;
  private current: string;

  constructor(input: string) {
    this.input = input;
    this.current = input[0] || '';
  }

  saveState(): LexerState {
    return { position: this.position, current: this.current };
  }

  restoreState(state: LexerState): void {
    this.position = state.position;
    this.current = state.current;
  }

  private advance(): void {
    this.position++;
    this.current = this.position < this.input.length ? this.input[this.position] : '';
  }

  private skipWhitespace(): void {
    while (this.current) {
      // Skip whitespace
      if (/\s/.test(this.current)) {
        this.advance();
        continue;
      }
      // Skip comments (# to end of line)
      if (this.current === '#') {
        this.skipComment();
        continue;
      }
      break;
    }
  }

  private skipComment(): void {
    // Skip everything until end of line or end of input
    while (this.current && this.current !== '\n') {
      this.advance();
    }
    // Skip the newline itself if present
    if (this.current === '\n') {
      this.advance();
    }
  }

  private readNumber(): string {
    let num = '';
    while (this.current && /[0-9.]/.test(this.current)) {
      // Stop before consuming '.' if it's part of '..' or '...' range operator
      if (this.current === '.' && this.peek() === '.') {
        break;
      }
      num += this.current;
      this.advance();
    }
    return num;
  }

  private readIdentifier(): string {
    let id = '';
    while (this.current && /[a-zA-Z_0-9]/.test(this.current)) {
      id += this.current;
      this.advance();
    }
    return id;
  }

  private peek(): string {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : '';
  }

  private readStringContent(): string {
    let str = '';
    while (this.current && this.current !== '"') {
      str += this.current;
      this.advance();
    }
    return str;
  }

  private readSingleQuotedString(): string {
    let str = '';
    while (this.current && this.current !== "'") {
      // Handle escape sequences
      if (this.current === '\\' && this.peek() === "'") {
        this.advance(); // skip backslash
        str += "'";
        this.advance();
      } else if (this.current === '\\' && this.peek() === '\\') {
        this.advance(); // skip first backslash
        str += '\\';
        this.advance();
      } else {
        str += this.current;
        this.advance();
      }
    }
    return str;
  }

  private readDateOrDateTime(): string {
    // Read ISO8601 date or datetime: 2024-01-15 or 2024-01-15T10:30:00.123Z
    let dateStr = '';
    // Read YYYY-MM-DD part
    while (this.current && /[0-9\-]/.test(this.current)) {
      dateStr += this.current;
      this.advance();
    }
    // Check if there's a time part (T)
    if (this.current === 'T') {
      dateStr += this.current;
      this.advance();
      // Read time part: HH:MM:SS
      while (this.current && /[0-9:]/.test(this.current)) {
        dateStr += this.current;
        this.advance();
      }
      // Optional fractional seconds (.123)
      const frac = this.current as string;
      if (frac === '.') {
        dateStr += frac;
        this.advance();
        while (this.current && /[0-9]/.test(this.current)) {
          dateStr += this.current;
          this.advance();
        }
      }
      // Optional timezone (Z or +/-HH:MM)
      const cur = this.current as string;
      if (cur === 'Z') {
        dateStr += cur;
        this.advance();
      } else if (cur === '+' || cur === '-') {
        dateStr += cur;
        this.advance();
        while (this.current && /[0-9:]/.test(this.current)) {
          dateStr += this.current;
          this.advance();
        }
      }
    }
    return dateStr;
  }

  private readDuration(): string {
    // Read ISO8601 duration: P1D, PT1H30M, P1Y2M3DT4H5M6S, P2W, etc.
    // Date components (Y, M, W, D) come before T
    // Time components (H, M, S) must come after T
    let duration = '';
    duration += this.current; // P
    this.advance();

    let seenT = false;

    // Read date part (Y, M, W, D) and/or time part (T followed by H, M, S)
    while (this.current && /[0-9YMWDTHMS.]/.test(this.current)) {
      const char = this.current;

      // Track when we see T (time separator)
      if (char === 'T') {
        seenT = true;
      }

      // H and S are only valid after T (time components)
      // M after T means minutes, M before T means months
      if ((char === 'H' || char === 'S') && !seenT) {
        // Invalid: H or S without T prefix - stop reading duration here
        break;
      }

      duration += char;
      this.advance();
    }

    return duration;
  }

  nextToken(): Token {
    this.skipWhitespace();

    if (!this.current) {
      return { type: 'EOF', value: '', position: this.position };
    }

    const pos = this.position;

    // Numbers
    if (/[0-9]/.test(this.current)) {
      return { type: 'NUMBER', value: this.readNumber(), position: pos };
    }

    // Date/DateTime literals: D2024-01-15 or D2024-01-15T10:30:00Z
    if (this.current === 'D') {
      const nextChar = this.peek();
      if (/[0-9]/.test(nextChar)) {
        // Date or DateTime literal starting with D
        this.advance(); // skip 'D'
        const dateTimeStr = this.readDateOrDateTime();
        // Distinguish between DATE and DATETIME based on presence of 'T'
        if (dateTimeStr.includes('T')) {
          return { type: 'DATETIME', value: dateTimeStr, position: pos };
        } else {
          return { type: 'DATE', value: dateTimeStr, position: pos };
        }
      }
    }

    // ISO8601 Duration: P1D, PT1H30M, P1Y2M3D, etc.
    if (this.current === 'P') {
      const durationStr = this.readDuration();
      if (durationStr.length > 1) {
        return { type: 'DURATION', value: durationStr, position: pos };
      }
    }

    // Single-quoted strings: 'hello world'
    if (this.current === "'") {
      this.advance(); // skip opening quote
      const str = this.readSingleQuotedString();
      this.advance(); // skip closing quote
      return { type: 'STRING', value: str, position: pos };
    }

    // Identifiers and keywords (true, false, let, in, NOW, TODAY, TOMORROW, YESTERDAY)
    if (/[a-zA-Z_]/.test(this.current)) {
      const id = this.readIdentifier();
      if (id === 'true' || id === 'false') {
        return { type: 'BOOLEAN', value: id, position: pos };
      }
      if (id === 'let') {
        return { type: 'LET', value: id, position: pos };
      }
      if (id === 'in') {
        return { type: 'IN', value: id, position: pos };
      }
      if (id === 'if') {
        return { type: 'IF', value: id, position: pos };
      }
      if (id === 'then') {
        return { type: 'THEN', value: id, position: pos };
      }
      if (id === 'else') {
        return { type: 'ELSE', value: id, position: pos };
      }
      if (id === 'and') {
        return { type: 'AND', value: id, position: pos };
      }
      if (id === 'or') {
        return { type: 'OR', value: id, position: pos };
      }
      if (id === 'not') {
        return { type: 'NOT', value: id, position: pos };
      }
      if (id === 'fn') {
        return { type: 'FN', value: id, position: pos };
      }
      const temporalKeywords = ['NOW', 'TODAY', 'TOMORROW', 'YESTERDAY',
        'SOD', 'EOD', 'SOW', 'EOW', 'SOM', 'EOM', 'SOQ', 'EOQ', 'SOY', 'EOY'];
      if (temporalKeywords.includes(id)) {
        return { type: 'IDENTIFIER', value: id, position: pos };
      }
      return { type: 'IDENTIFIER', value: id, position: pos };
    }

    // Multi-character operators
    const char = this.current;
    const next = this.peek();

    // Two-character operators
    if (char === '<' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'LTE', value: '<=', position: pos };
    }
    if (char === '>' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'GTE', value: '>=', position: pos };
    }
    if (char === '=') {
      if (next === '=') {
        this.advance();
        this.advance();
        return { type: 'EQ', value: '==', position: pos };
      }
      // Single = is ASSIGN
      this.advance();
      return { type: 'ASSIGN', value: '=', position: pos };
    }
    if (char === '!' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'NEQ', value: '!=', position: pos };
    }
    if (char === '&' && next === '&') {
      this.advance();
      this.advance();
      return { type: 'AND', value: '&&', position: pos };
    }
    if (char === '|') {
      if (next === '>') {
        // Pipe operator for chaining: a |> f(b)
        this.advance();
        this.advance();
        return { type: 'PIPE_OP', value: '|>', position: pos };
      }
      if (next === '|') {
        this.advance();
        this.advance();
        return { type: 'OR', value: '||', position: pos };
      }
      // Single pipe for predicate syntax: fn( x | body )
      this.advance();
      return { type: 'PIPE', value: '|', position: pos };
    }
    // Arrow for lambda syntax: fn( x ~> body )
    if (char === '~' && next === '>') {
      this.advance();
      this.advance();
      return { type: 'ARROW', value: '~>', position: pos };
    }
    // Range operators: .. (inclusive) and ... (exclusive)
    if (char === '.' && next === '.') {
      this.advance();
      this.advance();
      if (this.current === '.') {
        this.advance();
        return { type: 'RANGE_EXCL', value: '...', position: pos };
      }
      return { type: 'RANGE_INCL', value: '..', position: pos };
    }

    // Single-character operators
    this.advance();

    switch (char) {
      case '+': return { type: 'PLUS', value: char, position: pos };
      case '-': return { type: 'MINUS', value: char, position: pos };
      case '*': return { type: 'STAR', value: char, position: pos };
      case '/': return { type: 'SLASH', value: char, position: pos };
      case '%': return { type: 'PERCENT', value: char, position: pos };
      case '^': return { type: 'CARET', value: char, position: pos };
      case '(': return { type: 'LPAREN', value: char, position: pos };
      case ')': return { type: 'RPAREN', value: char, position: pos };
      case '{': return { type: 'LBRACE', value: char, position: pos };
      case '}': return { type: 'RBRACE', value: char, position: pos };
      case ',': return { type: 'COMMA', value: char, position: pos };
      case ':': return { type: 'COLON', value: char, position: pos };
      case '.':
        return { type: 'DOT', value: char, position: pos };
      case '<': return { type: 'LT', value: char, position: pos };
      case '>': return { type: 'GT', value: char, position: pos };
      case '!': return { type: 'NOT', value: char, position: pos };
      default:
        throw new Error(`Unexpected character '${char}' at position ${pos}`);
    }
  }
}

/**
 * Recursive descent parser for expressions
 *
 * Grammar:
 *   expr       -> pipe
 *   pipe       -> logical_or ('|>' call)*      // lowest precedence, left-assoc
 *   logical_or -> logical_and ('||' logical_and)*
 *   logical_and -> equality ('&&' equality)*
 *   equality   -> comparison (('==' | '!=') comparison)*
 *   comparison -> addition (('<' | '>' | '<=' | '>=') addition)*
 *   addition   -> term (('+' | '-') term)*
 *   term       -> factor (('*' | '/' | '%') factor)*
 *   factor     -> power
 *   power      -> unary ('^' unary)*
 *   unary      -> ('!' | '-' | '+') unary | primary
 *   primary    -> NUMBER | BOOLEAN | DATE | DATETIME | DURATION
 *               | IDENTIFIER '(' (expr (',' expr)*)? ')'  // function call
 *               | IDENTIFIER                               // variable
 *               | '(' expr ')'
 *
 * Pipe desugaring: `a |> f(b, c)` becomes `f(a, b, c)`
 */
interface ParserState {
  lexerState: LexerState;
  currentToken: Token;
  depth: number;
}

export interface ParserOptions {
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 100;

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  private depth: number = 0;
  private maxDepth: number;

  constructor(input: string, options: ParserOptions = {}) {
    this.lexer = new Lexer(input);
    this.currentToken = this.lexer.nextToken();
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  }

  private checkDepth(): void {
    if (this.depth > this.maxDepth) {
      throw new Error(`Maximum expression depth exceeded (${this.maxDepth})`);
    }
  }

  private saveState(): ParserState {
    return {
      lexerState: this.lexer.saveState(),
      currentToken: { ...this.currentToken },
      depth: this.depth
    };
  }

  private restoreState(state: ParserState): void {
    this.lexer.restoreState(state.lexerState);
    this.currentToken = state.currentToken;
    this.depth = state.depth;
  }

  private eat(tokenType: TokenType): void {
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.nextToken();
    } else {
      throw new Error(
        `Expected ${tokenType} but got ${this.currentToken.type} at position ${this.currentToken.position}`
      );
    }
  }

  private primary(): Expr {
    const token = this.currentToken;

    if (token.type === 'NUMBER') {
      this.eat('NUMBER');
      return literal(parseFloat(token.value));
    }

    if (token.type === 'BOOLEAN') {
      this.eat('BOOLEAN');
      return literal(token.value === 'true');
    }

    if (token.type === 'DATE') {
      this.eat('DATE');
      return dateLiteral(token.value);
    }

    if (token.type === 'DATETIME') {
      this.eat('DATETIME');
      return dateTimeLiteral(token.value);
    }

    if (token.type === 'DURATION') {
      this.eat('DURATION');
      return durationLiteral(token.value);
    }

    if (token.type === 'STRING') {
      this.eat('STRING');
      return stringLiteral(token.value);
    }

    if (token.type === 'IDENTIFIER') {
      const name = token.value;
      this.eat('IDENTIFIER');

      // Check if this is a temporal keyword
      const temporalKeywords = ['NOW', 'TODAY', 'TOMORROW', 'YESTERDAY',
        'SOD', 'EOD', 'SOW', 'EOW', 'SOM', 'EOM', 'SOQ', 'EOQ', 'SOY', 'EOY'];
      if (temporalKeywords.includes(name)) {
        return temporalKeyword(name as any);
      }

      // Check if this is a function call
      if (this.currentToken.type === 'LPAREN') {
        this.eat('LPAREN');
        const args: Expr[] = [];

        // Parse arguments
        // After eat(), currentToken changes - use type assertion to tell TypeScript
        const tok = this.currentToken as Token;
        if (tok.type !== 'RPAREN') {
          args.push(this.expr());
          while ((this.currentToken as Token).type === 'COMMA') {
            this.eat('COMMA');
            args.push(this.expr());
          }
        }

        this.eat('RPAREN');
        return functionCall(name, args);
      }

      // Otherwise, it's a variable
      return variable(name);
    }

    if (token.type === 'LPAREN') {
      this.eat('LPAREN');
      const expr = this.expr();
      this.eat('RPAREN');
      return expr;
    }

    // Handle let expressions (can appear anywhere an expression is expected)
    if (token.type === 'LET') {
      return this.letExpr();
    }

    // Handle if expressions (can appear anywhere an expression is expected)
    if (token.type === 'IF') {
      return this.ifExprParse();
    }

    // Handle lambda expressions: fn( x | body ) or fn( x, y | body )
    if (token.type === 'FN') {
      return this.lambdaParse();
    }

    // Handle object literals: {key: value, ...}
    if (token.type === 'LBRACE') {
      return this.objectParse();
    }

    throw new Error(`Unexpected token ${token.type} at position ${token.position}`);
  }

  private postfix(): Expr {
    let expr = this.primary();

    // Handle member access (dot notation)
    while (this.currentToken.type === 'DOT') {
      this.eat('DOT');
      const property = this.currentToken.value;
      this.eat('IDENTIFIER');
      expr = memberAccess(expr, property);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.currentToken.type === 'NOT') {
      this.eat('NOT');
      return unary('!', this.unary());
    }

    if (this.currentToken.type === 'PLUS') {
      this.eat('PLUS');
      return unary('+', this.unary());
    }

    if (this.currentToken.type === 'MINUS') {
      this.eat('MINUS');
      return unary('-', this.unary());
    }

    return this.postfix();
  }

  private power(): Expr {
    let node = this.unary();

    // Right-associative
    if (this.currentToken.type === 'CARET') {
      this.eat('CARET');
      node = binary('^', node, this.power());
    }

    return node;
  }

  private factor(): Expr {
    let node = this.power();

    while (['STAR', 'SLASH', 'PERCENT'].includes(this.currentToken.type)) {
      const token = this.currentToken;

      if (token.type === 'STAR') {
        this.eat('STAR');
        node = binary('*', node, this.power());
      } else if (token.type === 'SLASH') {
        this.eat('SLASH');
        node = binary('/', node, this.power());
      } else if (token.type === 'PERCENT') {
        this.eat('PERCENT');
        node = binary('%', node, this.power());
      }
    }

    return node;
  }

  private term(): Expr {
    return this.factor();
  }

  private addition(): Expr {
    let node = this.term();

    while (['PLUS', 'MINUS'].includes(this.currentToken.type)) {
      const token = this.currentToken;

      if (token.type === 'PLUS') {
        this.eat('PLUS');
        node = binary('+', node, this.term());
      } else if (token.type === 'MINUS') {
        this.eat('MINUS');
        node = binary('-', node, this.term());
      }
    }

    return node;
  }

  private comparison(): Expr {
    let node = this.addition();

    // Handle range membership: expr in expr..expr or expr in expr...expr
    // Also handles: expr not in expr..expr (negated range membership)
    // Use speculative parsing - if no range operator found after IN, restore state
    if (this.currentToken.type === 'IN') {
      const result = this.tryParseRangeMembership(node, false);
      if (result !== null) {
        return result;
      }
      // Not a range expression, continue with normal parsing
    }

    // Handle "not in" for negated range membership
    if (this.currentToken.type === 'NOT') {
      const result = this.tryParseRangeMembership(node, true);
      if (result !== null) {
        return result;
      }
      // Not a range expression, continue with normal parsing
    }

    while (['LT', 'GT', 'LTE', 'GTE'].includes(this.currentToken.type)) {
      const token = this.currentToken;

      if (token.type === 'LT') {
        this.eat('LT');
        node = binary('<', node, this.addition());
      } else if (token.type === 'GT') {
        this.eat('GT');
        node = binary('>', node, this.addition());
      } else if (token.type === 'LTE') {
        this.eat('LTE');
        node = binary('<=', node, this.addition());
      } else if (token.type === 'GTE') {
        this.eat('GTE');
        node = binary('>=', node, this.addition());
      }
    }

    return node;
  }

  private equality(): Expr {
    let node = this.comparison();

    while (['EQ', 'NEQ'].includes(this.currentToken.type)) {
      const token = this.currentToken;

      if (token.type === 'EQ') {
        this.eat('EQ');
        node = binary('==', node, this.comparison());
      } else if (token.type === 'NEQ') {
        this.eat('NEQ');
        node = binary('!=', node, this.comparison());
      }
    }

    return node;
  }

  private logical_and(): Expr {
    let node = this.equality();

    while (this.currentToken.type === 'AND') {
      this.eat('AND');
      node = binary('&&', node, this.equality());
    }

    return node;
  }

  private logical_or(): Expr {
    let node = this.logical_and();

    while (this.currentToken.type === 'OR') {
      this.eat('OR');
      node = binary('||', node, this.logical_and());
    }

    return node;
  }

  /**
   * Parse pipe expressions: a |> f(b) |> g(c)
   * Desugars to: g(f(a, b), c)
   * Left-associative, lowest precedence (below logical_or)
   */
  private pipe(): Expr {
    let node = this.logical_or();

    while (this.currentToken.type === 'PIPE_OP') {
      this.eat('PIPE_OP');

      // Right side must be a function call: identifier followed by (
      const tok = this.currentToken as Token;
      if (tok.type !== 'IDENTIFIER') {
        throw new Error(
          `Expected function call after |> at position ${tok.position}`
        );
      }

      const funcName = tok.value;
      this.eat('IDENTIFIER');

      const tok2 = this.currentToken as Token;
      if (tok2.type !== 'LPAREN') {
        throw new Error(
          `Expected '(' after function name in pipe at position ${tok2.position}`
        );
      }

      this.eat('LPAREN');
      const args: Expr[] = [node]; // Left side becomes first argument

      // Parse additional arguments
      if ((this.currentToken as Token).type !== 'RPAREN') {
        args.push(this.expr());
        while ((this.currentToken as Token).type === 'COMMA') {
          this.eat('COMMA');
          args.push(this.expr());
        }
      }

      this.eat('RPAREN');
      node = functionCall(funcName, args);
    }

    return node;
  }

  /**
   * Try to parse range membership: expr in expr..expr or expr in expr...expr
   * Also handles: expr not in expr..expr (when negated is true)
   * Returns null if this is not a range expression (e.g., it's 'in' from 'let...in')
   */
  private tryParseRangeMembership(node: Expr, negated: boolean): Expr | null {
    const savedState = this.saveState();

    // For "not in", consume NOT first, then expect IN
    if (negated) {
      this.eat('NOT');
      if (this.currentToken.type !== 'IN') {
        this.restoreState(savedState);
        return null;
      }
    }

    this.eat('IN');
    const rangeStart = this.addition();

    let inclusive: boolean;
    if (this.currentToken.type === 'RANGE_INCL') {
      this.eat('RANGE_INCL');
      inclusive = true;
    } else if (this.currentToken.type === 'RANGE_EXCL') {
      this.eat('RANGE_EXCL');
      inclusive = false;
    } else {
      // No range operator found - this is not a range expression
      // Restore state and return null
      this.restoreState(savedState);
      return null;
    }

    const rangeEnd = this.addition();

    const rangeExpr = this.desugarRangeMembership(node, rangeStart, rangeEnd, inclusive);

    // Wrap in NOT if negated
    if (negated) {
      return unary('!', rangeExpr);
    }
    return rangeExpr;
  }

  /**
   * Desugar range membership expression.
   * `value in start..end` becomes `value >= start and value <= end`
   * `value in start...end` becomes `value >= start and value < end`
   *
   * For complex expressions, wraps in let to avoid multiple evaluation.
   */
  private desugarRangeMembership(value: Expr, start: Expr, end: Expr, inclusive: boolean): Expr {
    const isSimple = (e: Expr): boolean => {
      return e.type === 'literal' || e.type === 'variable' ||
             e.type === 'date' || e.type === 'datetime' ||
             e.type === 'temporal_keyword';
    };

    const endOp = inclusive ? '<=' : '<';

    if (isSimple(value) && isSimple(start) && isSimple(end)) {
      // Direct expansion for simple expressions
      return binary('&&',
        binary('>=', value, start),
        binary(endOp, value, end)
      );
    }

    // Wrap in let to avoid multiple evaluation
    return letExpr(
      [
        { name: '_v', value },
        { name: '_lo', value: start },
        { name: '_hi', value: end }
      ],
      binary('&&',
        binary('>=', variable('_v'), variable('_lo')),
        binary(endOp, variable('_v'), variable('_hi'))
      )
    );
  }

  private letExpr(): Expr {
    this.eat('LET');

    const bindings: LetBinding[] = [];

    // Parse first binding
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    this.eat('ASSIGN');
    // Binding values parsed at logical_or level (prevents unparenthesized nested let in bindings)
    const firstValue = this.logical_or();
    bindings.push({ name: firstName, value: firstValue });

    // Parse additional bindings
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('ASSIGN');
      const value = this.logical_or();
      bindings.push({ name, value });
    }

    this.eat('IN');
    const body = this.expr(); // Body can be any expression including nested let

    return letExpr(bindings, body);
  }

  private ifExprParse(): Expr {
    this.eat('IF');
    const condition = this.expr();
    this.eat('THEN');
    const thenBranch = this.expr();
    this.eat('ELSE');
    const elseBranch = this.expr();
    return ifExpr(condition, thenBranch, elseBranch);
  }

  /**
   * Parse lambda or predicate expression:
   * - Lambda: fn( x ~> body ) or fn( x, y ~> body )
   * - Predicate: fn( x | body ) or fn( x, y | body )
   */
  private lambdaParse(): Expr {
    this.eat('FN');
    this.eat('LPAREN');

    const params: string[] = [];

    // Parse first parameter
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    params.push(firstName);

    // Parse additional parameters
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      params.push(name);
    }

    // Check if it's a predicate (|) or lambda (~>)
    const isPredicate = this.currentToken.type === 'PIPE';
    if (isPredicate) {
      this.eat('PIPE');
    } else {
      this.eat('ARROW');
    }

    const body = this.expr();
    this.eat('RPAREN');

    return isPredicate ? predicate(params, body) : lambda(params, body);
  }

  /**
   * Parse object literal: {key: value, key2: value2, ...}
   */
  private objectParse(): Expr {
    this.eat('LBRACE');

    const properties: ObjectProperty[] = [];

    // Handle empty object
    if (this.currentToken.type === 'RBRACE') {
      this.eat('RBRACE');
      return objectLiteral(properties);
    }

    // Parse first property
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    this.eat('COLON');
    const firstValue = this.expr();
    properties.push({ key: firstName, value: firstValue });

    // Parse additional properties
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('COLON');
      const value = this.expr();
      properties.push({ key: name, value });
    }

    this.eat('RBRACE');
    return objectLiteral(properties);
  }

  private expr(): Expr {
    this.depth++;
    this.checkDepth();
    try {
      // Let and if expressions have lowest precedence
      if (this.currentToken.type === 'LET') {
        return this.letExpr();
      }
      if (this.currentToken.type === 'IF') {
        return this.ifExprParse();
      }
      return this.pipe();
    } finally {
      this.depth--;
    }
  }

  parse(): Expr {
    const result = this.expr();
    this.eat('EOF');
    return result;
  }
}

/**
 * Parse an arithmetic expression string into an AST
 */
export function parse(input: string, options: ParserOptions = {}): Expr {
  const parser = new Parser(input, options);
  return parser.parse();
}
