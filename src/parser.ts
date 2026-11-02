import { Expr, literal, nullLiteral, stringLiteral, variable, binary, unary, dateLiteral, dateTimeLiteral, durationLiteral, temporalKeyword, functionCall, memberAccess, letExpr, ifExpr, lambda, LetBinding, objectLiteral, ObjectProperty, arrayLiteral, alternative, apply, dataPath, TypeExpr, TypeSchemaProperty, typeRef, typeSchema, typeDef, subtypeConstraint, arrayType, unionType, Constraint, guardExpr, TypeBinding, withTypeDefs, ImportDecl, Located, locate, SourceLocation, formatSourceLocation } from './ast';

/**
 * Token types
 */
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'       // lowercase: user variables (x, foo, my_var)
  | 'UPPER_IDENTIFIER' // uppercase: Types, Selectors, temporal keywords (NOW, TODAY, String)
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
  | 'LBRACKET'
  | 'RBRACKET'
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
  | 'GUARD'
  | 'CHECK'
  | 'ASSIGN'
  | 'QUESTION'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

/**
 * Tokenizer for arithmetic expressions
 */
interface LexerState {
  position: number;
  current: string;
  line: number;
  column: number;
}

class Lexer {
  private input: string;
  private position: number = 0;
  private current: string;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
    this.current = input[0] || '';
  }

  saveState(): LexerState {
    return { position: this.position, current: this.current, line: this.line, column: this.column };
  }

  restoreState(state: LexerState): void {
    this.position = state.position;
    this.current = state.current;
    this.line = state.line;
    this.column = state.column;
  }

  private advance(): void {
    // Track line/column before moving
    if (this.current === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
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
    let hasDot = false;
    while (this.current && /[0-9.]/.test(this.current)) {
      // Stop before consuming '.' if it's part of '..' or '...' range operator
      if (this.current === '.' && this.peek() === '.') {
        break;
      }
      // Only allow one decimal point, and only if followed by a digit
      if (this.current === '.') {
        if (hasDot) {
          // Already have a decimal point, stop here
          break;
        }
        // Check if the next char is a digit - if not, this dot starts a new token
        if (!/[0-9]/.test(this.peek())) {
          break;
        }
        hasDot = true;
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
      if (this.current === '\\') {
        const next = this.peek();
        if (next === "'") {
          this.advance(); str += "'"; this.advance();
        } else if (next === '\\') {
          this.advance(); str += '\\'; this.advance();
        } else if (next === 'n') {
          this.advance(); str += '\n'; this.advance();
        } else if (next === 't') {
          this.advance(); str += '\t'; this.advance();
        } else {
          str += this.current;
          this.advance();
        }
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
      return { type: 'EOF', value: '', position: this.position, line: this.line, column: this.column };
    }

    const pos = this.position;
    const line = this.line;
    const col = this.column;

    // Numbers
    if (/[0-9]/.test(this.current)) {
      return { type: 'NUMBER', value: this.readNumber(), position: pos, line, column: col };
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
          return { type: 'DATETIME', value: dateTimeStr, position: pos, line, column: col };
        } else {
          return { type: 'DATE', value: dateTimeStr, position: pos, line, column: col };
        }
      }
    }

    // ISO8601 Duration: P1D, PT1H30M, P1Y2M3D, etc.
    if (this.current === 'P') {
      // Save state in case this isn't actually a duration
      const savedState = this.saveState();
      const durationStr = this.readDuration();
      if (durationStr.length > 1) {
        return { type: 'DURATION', value: durationStr, position: pos, line, column: col };
      }
      // Not a valid duration, restore state and continue to identifier parsing
      this.restoreState(savedState);
    }

    // Single-quoted strings: 'hello world'
    if (this.current === "'") {
      this.advance(); // skip opening quote
      const str = this.readSingleQuotedString();
      this.advance(); // skip closing quote
      return { type: 'STRING', value: str, position: pos, line, column: col };
    }

    // Identifiers and keywords (true, false, let, in, NOW, TODAY, TOMORROW, YESTERDAY)
    if (/[a-zA-Z_]/.test(this.current)) {
      const id = this.readIdentifier();
      if (id === 'true' || id === 'false') {
        return { type: 'BOOLEAN', value: id, position: pos, line, column: col };
      }
      if (id === 'null') {
        return { type: 'NULL', value: id, position: pos, line, column: col };
      }
      if (id === 'let') {
        return { type: 'LET', value: id, position: pos, line, column: col };
      }
      if (id === 'in') {
        return { type: 'IN', value: id, position: pos, line, column: col };
      }
      if (id === 'if') {
        return { type: 'IF', value: id, position: pos, line, column: col };
      }
      if (id === 'then') {
        return { type: 'THEN', value: id, position: pos, line, column: col };
      }
      if (id === 'else') {
        return { type: 'ELSE', value: id, position: pos, line, column: col };
      }
      if (id === 'and') {
        return { type: 'AND', value: id, position: pos, line, column: col };
      }
      if (id === 'or') {
        return { type: 'OR', value: id, position: pos, line, column: col };
      }
      if (id === 'not') {
        return { type: 'NOT', value: id, position: pos, line, column: col };
      }
      if (id === 'fn') {
        return { type: 'FN', value: id, position: pos, line, column: col };
      }
      if (id === 'guard') {
        return { type: 'GUARD', value: id, position: pos, line, column: col };
      }
      if (id === 'check') {
        return { type: 'CHECK', value: id, position: pos, line, column: col };
      }
      // Uppercase identifiers: types, selectors, temporal keywords
      if (/^[A-Z]/.test(id)) {
        return { type: 'UPPER_IDENTIFIER', value: id, position: pos, line, column: col };
      }
      // Lowercase identifiers: user variables
      return { type: 'IDENTIFIER', value: id, position: pos, line, column: col };
    }

    // Multi-character operators
    const char = this.current;
    const next = this.peek();

    // Two-character operators
    if (char === '<' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'LTE', value: '<=', position: pos, line, column: col };
    }
    if (char === '>' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'GTE', value: '>=', position: pos, line, column: col };
    }
    if (char === '=') {
      if (next === '=') {
        this.advance();
        this.advance();
        return { type: 'EQ', value: '==', position: pos, line, column: col };
      }
      // Single = is ASSIGN
      this.advance();
      return { type: 'ASSIGN', value: '=', position: pos, line, column: col };
    }
    if (char === '!' && next === '=') {
      this.advance();
      this.advance();
      return { type: 'NEQ', value: '!=', position: pos, line, column: col };
    }
    if (char === '&' && next === '&') {
      this.advance();
      this.advance();
      return { type: 'AND', value: '&&', position: pos, line, column: col };
    }
    if (char === '|') {
      if (next === '>') {
        // Pipe operator for chaining: a |> f(b)
        this.advance();
        this.advance();
        return { type: 'PIPE_OP', value: '|>', position: pos, line, column: col };
      }
      if (next === '|') {
        this.advance();
        this.advance();
        return { type: 'OR', value: '||', position: pos, line, column: col };
      }
      // Single pipe for predicate syntax: fn( x | body )
      this.advance();
      return { type: 'PIPE', value: '|', position: pos, line, column: col };
    }
    // Arrow for lambda syntax: fn( x ~> body )
    if (char === '~' && next === '>') {
      this.advance();
      this.advance();
      return { type: 'ARROW', value: '~>', position: pos, line, column: col };
    }
    // Range operators: .. (inclusive) and ... (exclusive)
    if (char === '.' && next === '.') {
      this.advance();
      this.advance();
      if (this.current === '.') {
        this.advance();
        return { type: 'RANGE_EXCL', value: '...', position: pos, line, column: col };
      }
      return { type: 'RANGE_INCL', value: '..', position: pos, line, column: col };
    }

    // Single-character operators
    this.advance();

    switch (char) {
      case '+': return { type: 'PLUS', value: char, position: pos, line, column: col };
      case '-': return { type: 'MINUS', value: char, position: pos, line, column: col };
      case '*': return { type: 'STAR', value: char, position: pos, line, column: col };
      case '/': return { type: 'SLASH', value: char, position: pos, line, column: col };
      case '%': return { type: 'PERCENT', value: char, position: pos, line, column: col };
      case '^': return { type: 'CARET', value: char, position: pos, line, column: col };
      case '(': return { type: 'LPAREN', value: char, position: pos, line, column: col };
      case ')': return { type: 'RPAREN', value: char, position: pos, line, column: col };
      case '{': return { type: 'LBRACE', value: char, position: pos, line, column: col };
      case '}': return { type: 'RBRACE', value: char, position: pos, line, column: col };
      case '[': return { type: 'LBRACKET', value: char, position: pos, line, column: col };
      case ']': return { type: 'RBRACKET', value: char, position: pos, line, column: col };
      case ',': return { type: 'COMMA', value: char, position: pos, line, column: col };
      case ':': return { type: 'COLON', value: char, position: pos, line, column: col };
      case '?': return { type: 'QUESTION', value: char, position: pos, line, column: col };
      case '.':
        return { type: 'DOT', value: char, position: pos, line, column: col };
      case '<': return { type: 'LT', value: char, position: pos, line, column: col };
      case '>': return { type: 'GT', value: char, position: pos, line, column: col };
      case '!': return { type: 'NOT', value: char, position: pos, line, column: col };
      default:
        throw new Error(`Unexpected character '${char}' at line ${line}, column ${col}`);
    }
  }
}

/**
 * Recursive descent parser for expressions
 *
 * Grammar:
 *   program     -> imports typePrelude expr
 *   imports     -> ('import' '{' name (',' name)* '}' 'from' STRING
 *                 | 'import' STRING 'as' IDENTIFIER)*     // file-level imports
 *   typePrelude -> (UPPER_IDENTIFIER '=' typeExpr ','?)*  // file-level type definitions
 *   expr        -> pipe
 *   pipe        -> logical_or ('|>' IDENTIFIER call?)*  // lowest precedence, left-assoc, parens optional
 *   logical_or  -> logical_and ('||' logical_and)*
 *   logical_and -> alternative ('&&' alternative)*
 *   alternative -> equality ('|' equality)*     // alternative/fallback operator
 *   equality    -> comparison (('==' | '!=') comparison)*
 *   comparison  -> addition (('<' | '>' | '<=' | '>=') addition)*
 *   addition    -> term (('+' | '-') term)*
 *   term        -> factor (('*' | '/' | '%') factor)*
 *   factor      -> power
 *   power       -> unary ('^' unary)*
 *   unary       -> ('!' | '-' | '+') unary | primary
 *   primary     -> NUMBER | BOOLEAN | DATE | DATETIME | DURATION
 *                | IDENTIFIER '(' (expr (',' expr)*)? ')'  // function call
 *                | IDENTIFIER                               // variable
 *                | '(' expr ')'
 *
 * Pipe desugaring: `a |> f(b, c)` becomes `f(a, b, c)`
 * Alternative: `a | b | c` evaluates left-to-right, returns first non-null
 */
interface ParserState {
  lexerState: LexerState;
  currentToken: Token;
  depth: number;
}

export interface ParserOptions {
  maxDepth?: number;
  /**
   * Record where each node came from in the source.
   *
   * Off by default, so an AST is a plain value: comparing one with
   * deepStrictEqual, serializing it with toEloCode or building one by hand all
   * behave exactly as before. Ask for locations when you need a diagnostic to
   * report *where* a problem is — `eloc` and `elo` always do, since every
   * refusal below the parse takes its position off the node in hand.
   */
  locations?: boolean;
  /**
   * Which source this is, recorded on every location.
   *
   * Only meaningful with `locations`. The module loader passes the path of
   * each module it reads, so a diagnostic about an inlined node says which
   * file its line and column are in.
   */
  file?: string;
  /**
   * Which line of its file the source starts on, 1-based and 1 by default.
   *
   * A `.elo` read one expression per line parses each line on its own, and a
   * position is only useful to its author if it counts from the top of the
   * file rather than from the top of the line.
   */
  firstLine?: number;
}

const DEFAULT_MAX_DEPTH = 100;

/**
 * The part of the message `parse` gives when a source continues after its
 * expression has ended.
 *
 * Exported so that a host can recognise that case and say something more
 * useful about it than the parser can: the CLIs point at `--lines`, because a
 * source holding two expressions is almost always a file meant to be read one
 * expression per line.
 */
export const TRAILING_INPUT = 'after the end of the expression';

/**
 * Tokens that can never begin the start of a range.
 *
 * Each of these opens a construct whose body runs to the end of the
 * expression, so a following `..` is always consumed by that body rather than
 * left for the range. Seeing one straight after `in` means the `in` belongs to
 * a `let`/`guard`/`check`, not to a range membership.
 */
const CANNOT_START_A_RANGE: ReadonlySet<TokenType> = new Set<TokenType>([
  'LET',
  'GUARD',
  'CHECK',
]);

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  private depth: number = 0;
  private maxDepth: number;
  private locations: boolean;
  private file?: string;
  private firstLine: number;

  constructor(input: string, options: ParserOptions = {}) {
    this.lexer = new Lexer(input);
    this.currentToken = this.lexer.nextToken();
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.locations = options.locations ?? false;
    this.file = options.file;
    this.firstLine = options.firstLine ?? 1;
  }

  /**
   * Tag a node with the position of the token it came from, when locations
   * were asked for. Returns the node either way, so call sites read as
   * `this.at(binary(...), opToken)` whether or not the feature is on.
   */
  private at<T extends Located>(node: T, token: Token): T {
    if (this.locations) {
      node.loc = this.locationOf(token);
    }
    return node;
  }

  /**
   * Where a token is, counted from the top of its file.
   *
   * The one place a position is built, so a parse error, a node's `loc` and a
   * refused construct all say where they are the same way.
   */
  private locationOf(token: Token): SourceLocation {
    return {
      line: this.firstLine - 1 + token.line,
      column: token.column,
      ...(this.file ? { file: this.file } : {}),
    };
  }

  /**
   * The token the parser is about to consume, for tagging a node that is
   * built after its first token has been eaten.
   */
  private here(): Token {
    return this.currentToken;
  }

  /**
   * Build a node, saying where it was written if building it is refused.
   *
   * The AST factories refuse what no target can express — a name bound twice,
   * a parameter named twice — and they are given names rather than tokens, so
   * the position comes from here. A refusal that already names a position
   * keeps it: with `locations` on, the bindings carry one of their own and
   * point at the offending name rather than at the construct holding it.
   */
  private built<T>(token: Token, build: () => T): T {
    try {
      return build();
    } catch (error) {
      throw locate(error, this.locationOf(token));
    }
  }

  private checkDepth(): void {
    if (this.depth > this.maxDepth) {
      throw new Error(`Maximum expression depth exceeded (${this.maxDepth})`);
    }
  }

  /**
   * Count one level of recursive descent against the depth guard. Wrap only the
   * self-recursive call sites of a parse function with this, so that a single,
   * non-recursive call costs nothing and the depth budget keeps its original
   * meaning for ordinary expressions while deep recursion stays bounded.
   */
  private descend<T>(parse: () => T): T {
    this.depth++;
    this.checkDepth();
    try {
      return parse();
    } finally {
      this.depth--;
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

  private formatLocation(token: Token): string {
    return formatSourceLocation(this.locationOf(token));
  }

  private eat(tokenType: TokenType): void {
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.nextToken();
    } else {
      throw new Error(
        `Expected ${tokenType} but got ${this.currentToken.type} at ${this.formatLocation(this.currentToken)}`
      );
    }
  }

  /**
   * A primary expression, positioned at the token it starts with.
   *
   * Tagged here rather than at each of the fifteen returns below, and only
   * where nothing more precise is known: a member access points at the field
   * name and a binary operator at the operator, which is where a reader looks.
   * Every node carrying a position is what lets a refusal name one.
   */
  private primary(): Expr {
    const token = this.currentToken;
    const node = this.primaryNode();
    return node.loc ? node : this.at(node, token);
  }

  private primaryNode(): Expr {
    const token = this.currentToken;

    if (token.type === 'NUMBER') {
      this.eat('NUMBER');
      return literal(parseFloat(token.value), token.value.includes('.'));
    }

    if (token.type === 'BOOLEAN') {
      this.eat('BOOLEAN');
      return literal(token.value === 'true');
    }

    if (token.type === 'NULL') {
      this.eat('NULL');
      return nullLiteral();
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

    // Uppercase identifiers: temporal keywords, types, selectors
    if (token.type === 'UPPER_IDENTIFIER') {
      const name = token.value;
      this.eat('UPPER_IDENTIFIER');

      // Check if this is a temporal keyword
      const temporalKeywords = ['NOW', 'TODAY', 'TOMORROW', 'YESTERDAY',
        'SOD', 'EOD', 'SOW', 'EOW', 'SOM', 'EOM', 'SOQ', 'EOQ', 'SOY', 'EOY',
        'BOT', 'EOT'];
      if (temporalKeywords.includes(name)) {
        return temporalKeyword(name as any);
      }

      // Check if this is a function call (uppercase functions like Type selectors)
      if (this.currentToken.type === 'LPAREN') {
        this.eat('LPAREN');
        const args: Expr[] = [];

        const tok = this.currentToken as Token;
        if (tok.type !== 'RPAREN') {
          args.push(this.expr());
          while ((this.currentToken as Token).type === 'COMMA') {
            this.eat('COMMA');
            args.push(this.expr());
          }
        }

        this.eat('RPAREN');
        return this.at(functionCall(name, args), token);
      }

      throw new Error(
        `Unknown uppercase identifier '${name}' at ${this.formatLocation(token)}`
      );
    }

    // Lowercase identifiers: user variables, function calls
    if (token.type === 'IDENTIFIER') {
      const name = token.value;
      this.eat('IDENTIFIER');

      // Lambda sugar: x ~> body (single parameter only)
      // Body parsed at pipe() level to stop before == and other low-precedence operators
      // Use fn(x ~> body) syntax for bodies containing == comparisons
      if (this.currentToken.type === 'ARROW') {
        this.eat('ARROW');
        const body = this.pipe();
        return lambda([name], body);
      }

      // Check if this is a function call
      if (this.currentToken.type === 'LPAREN') {
        // Special handling for guard/check pipe-style: guard(x | condition)
        if (name === 'guard' || name === 'check') {
          const pipeGuard = this.tryParsePipeGuard(name as 'guard' | 'check');
          if (pipeGuard) {
            return pipeGuard;
          }
        }

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
        return this.at(functionCall(name, args), token);
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

    // Handle guard expressions: guard [label:] condition in body
    // Note: pipe-style guard(x | condition) is handled in expr() via guardOrPipeGuard
    if (token.type === 'GUARD') {
      return this.guardExprParse('guard');
    }

    // Handle check expressions (synonym for guard, for postconditions)
    if (token.type === 'CHECK') {
      return this.guardExprParse('check');
    }

    // Handle lambda expressions: fn( x | body ) or fn( x, y | body )
    if (token.type === 'FN') {
      return this.lambdaParse();
    }

    // Handle object literals: {key: value, ...}
    if (token.type === 'LBRACE') {
      return this.objectParse();
    }

    // Handle array literals: [expr, expr, ...]
    if (token.type === 'LBRACKET') {
      return this.arrayParse();
    }

    // Handle datapath literals: .x.y.z
    if (token.type === 'DOT') {
      return this.datapathParse();
    }

    throw new Error(`Unexpected token ${token.type} at ${this.formatLocation(token)}`);
  }

  private postfix(): Expr {
    let expr = this.primary();

    // Handle member access (dot notation) and function application
    while (this.currentToken.type === 'DOT' || this.currentToken.type === 'LPAREN') {
      if (this.currentToken.type === 'DOT') {
        this.eat('DOT');
        // The property name locates the node: a reader told the field does not
        // exist wants to be pointed at the field, not at the object.
        const nameToken = this.here();
        const property = this.currentToken.value;
        this.eat('IDENTIFIER');
        expr = this.at(memberAccess(expr, property), nameToken);
      } else {
        // Function application: expr(args)
        this.eat('LPAREN');
        const args: Expr[] = [];
        // After eat(), currentToken changes - use type assertion to tell TypeScript
        if ((this.currentToken as Token).type !== 'RPAREN') {
          args.push(this.expr());
          while ((this.currentToken as Token).type === 'COMMA') {
            this.eat('COMMA');
            args.push(this.expr());
          }
        }
        this.eat('RPAREN');
        expr = apply(expr, args);
      }
    }

    return expr;
  }

  private unary(): Expr {
    // The operator token locates the node: that is where a reader looks when
    // told the operand types are wrong.
    const op = this.here();

    if (this.currentToken.type === 'NOT') {
      this.eat('NOT');
      return this.at(unary('!', this.descend(() => this.unary())), op);
    }

    if (this.currentToken.type === 'PLUS') {
      this.eat('PLUS');
      return this.at(unary('+', this.descend(() => this.unary())), op);
    }

    if (this.currentToken.type === 'MINUS') {
      this.eat('MINUS');
      return this.at(unary('-', this.descend(() => this.unary())), op);
    }

    return this.postfix();
  }

  private power(): Expr {
    let node = this.unary();

    // Right-associative
    if (this.currentToken.type === 'CARET') {
      const op = this.here();
      this.eat('CARET');
      node = this.at(binary('^', node, this.descend(() => this.power())), op);
    }

    return node;
  }

  private factor(): Expr {
    let node = this.power();

    while (['STAR', 'SLASH', 'PERCENT'].includes(this.currentToken.type)) {
      const token = this.currentToken;

      if (token.type === 'STAR') {
        this.eat('STAR');
        node = this.at(binary('*', node, this.power()), token);
      } else if (token.type === 'SLASH') {
        this.eat('SLASH');
        node = this.at(binary('/', node, this.power()), token);
      } else if (token.type === 'PERCENT') {
        this.eat('PERCENT');
        node = this.at(binary('%', node, this.power()), token);
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
        node = this.at(binary('+', node, this.term()), token);
      } else if (token.type === 'MINUS') {
        this.eat('MINUS');
        node = this.at(binary('-', node, this.term()), token);
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
        node = this.at(binary('<', node, this.addition()), token);
      } else if (token.type === 'GT') {
        this.eat('GT');
        node = this.at(binary('>', node, this.addition()), token);
      } else if (token.type === 'LTE') {
        this.eat('LTE');
        node = this.at(binary('<=', node, this.addition()), token);
      } else if (token.type === 'GTE') {
        this.eat('GTE');
        node = this.at(binary('>=', node, this.addition()), token);
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
        node = this.at(binary('==', node, this.comparison()), token);
      } else if (token.type === 'NEQ') {
        this.eat('NEQ');
        node = this.at(binary('!=', node, this.comparison()), token);
      }
    }

    return node;
  }

  private logical_and(): Expr {
    let node = this.alternative();

    while (this.currentToken.type === 'AND') {
      const token = this.here();
      this.eat('AND');
      node = this.at(binary('&&', node, this.alternative()), token);
    }

    return node;
  }

  /**
   * Parse alternative expressions: a | b | c
   * Returns first non-null value, left-to-right evaluation.
   */
  private alternative(): Expr {
    let node = this.equality();
    const alternatives: Expr[] = [node];

    while (this.currentToken.type === 'PIPE') {
      this.eat('PIPE');
      alternatives.push(this.equality());
    }

    if (alternatives.length === 1) {
      return node;
    }

    return alternative(alternatives);
  }

  private logical_or(): Expr {
    let node = this.logical_and();

    while (this.currentToken.type === 'OR') {
      const token = this.here();
      this.eat('OR');
      node = this.at(binary('||', node, this.logical_and()), token);
    }

    return node;
  }

  /**
   * Parse pipe expressions: a |> f(b) |> g(c) or a |> f |> g
   * Desugars to: g(f(a, b), c) or g(f(a))
   * Left-associative, lowest precedence (below logical_or)
   * Parentheses are optional: a |> f is equivalent to a |> f()
   */
  private pipe(): Expr {
    let node = this.logical_or();

    while (this.currentToken.type === 'PIPE_OP') {
      this.eat('PIPE_OP');

      // Right side must be an identifier (function name), uppercase (type name), or guard/check
      const tok = this.currentToken as Token;
      if (tok.type !== 'IDENTIFIER' && tok.type !== 'UPPER_IDENTIFIER' &&
          tok.type !== 'GUARD' && tok.type !== 'CHECK') {
        throw new Error(
          `Expected function name after |> at ${this.formatLocation(tok)}`
        );
      }

      const funcName = tok.value;
      const isGuardOrCheck = tok.type === 'GUARD' || tok.type === 'CHECK';
      this.eat(tok.type);

      // For guard/check with pipe-style syntax, parse specially
      if (isGuardOrCheck && (this.currentToken as Token).type === 'LPAREN') {
        const guardType = funcName as 'guard' | 'check';
        const pipeGuard = this.tryParsePipeGuardBody(guardType);
        if (pipeGuard) {
          // Apply the lambda to the piped value: node |> guard(x | cond) -> pipeGuard(node)
          node = apply(pipeGuard, [node]);
          continue;
        }
      }

      const args: Expr[] = [node]; // Left side becomes first argument

      // Parentheses are optional - if present, parse additional arguments
      const tok2 = this.currentToken as Token;
      if (tok2.type === 'LPAREN') {
        this.eat('LPAREN');

        // Parse additional arguments
        if ((this.currentToken as Token).type !== 'RPAREN') {
          args.push(this.expr());
          while ((this.currentToken as Token).type === 'COMMA') {
            this.eat('COMMA');
            args.push(this.expr());
          }
        }

        this.eat('RPAREN');
      }

      node = this.at(functionCall(funcName, args), tok);
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

    // `in` is overloaded: it ends a `let`/`guard` binding and it is the range
    // membership operator. The two are told apart by speculatively parsing a
    // range and backtracking, and that speculation is what used to make the
    // parser exponential — on `let a = 1 in let a = 1 in …` each level parsed
    // the whole remaining body once to fail, then again for real, so a 390
    // character expression never finished.
    //
    // A range start can never be an unparenthesised `let`, `guard` or `check`:
    // their body swallows everything up to the end, so the `..` the range
    // needs is consumed before it can be seen. Bailing out here therefore
    // rejects nothing that used to parse — it only skips a speculation that
    // was always going to fail, which is exactly the expensive one. Both
    // `(let a = 1 in a) .. 10` and `if c then 1 else 2 .. 10` still parse,
    // since neither starts with one of these tokens.
    if (CANNOT_START_A_RANGE.has(this.currentToken.type)) {
      this.restoreState(savedState);
      return null;
    }

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

  /**
   * Trailing commas are allowed: let x=2, y=3, in x*y
   */
  private letExpr(): Expr {
    const letToken = this.here();
    this.eat('LET');

    // Check if this is a type definition (uppercase identifier)
    if (this.currentToken.type === 'UPPER_IDENTIFIER') {
      return this.typeDefExpr();
    }

    const bindings: LetBinding[] = [];

    // Parse first binding
    const firstToken = this.here();
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    this.eat('ASSIGN');
    // Binding values parsed at pipe level (pipe won't consume 'in'/'guard'/'check' keywords)
    const firstValue = this.pipe();
    // The binding is tagged with the position of its name, not of the `let`:
    // a name bound twice is reported where the second one is written.
    bindings.push(this.at<LetBinding>({ name: firstName, value: firstValue }, firstToken));

    // Parse additional bindings
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token ends bindings (IN, GUARD, CHECK)
      const nextType = (this.currentToken as Token).type;
      if (nextType === 'IN' || nextType === 'GUARD' || nextType === 'CHECK') break;
      const nameToken = this.here();
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('ASSIGN');
      const value = this.pipe();
      bindings.push(this.at<LetBinding>({ name, value }, nameToken));
    }

    // Check for let...guard or let...check sugar: let x = ... guard/check condition in body
    if ((this.currentToken as Token).type === 'GUARD') {
      const inner = this.guardExprParse('guard');
      return this.built(letToken, () => letExpr(bindings, inner));
    }
    if ((this.currentToken as Token).type === 'CHECK') {
      const inner = this.guardExprParse('check');
      return this.built(letToken, () => letExpr(bindings, inner));
    }

    this.eat('IN');
    const body = this.expr(); // Body can be any expression including nested let

    return this.built(letToken, () => letExpr(bindings, body));
  }

  /**
   * Parse a type definition: let Person = { name: String, age: Int } in body
   * Called after 'let' when we see an UPPER_IDENTIFIER
   * Supports multiple bindings: let Person = {...}, Persons = [Person] in body
   * Trailing commas are allowed: let Person = {...}, in body
   */
  private typeDefExpr(): Expr {
    const nameToken = this.here();
    const definitions: TypeBinding[] = [];

    // Collected in a loop rather than by recursing on the tail: a hundred type
    // definitions are a hundred names, not a hundred levels of nesting.
    for (;;) {
      const defToken = this.here();
      const name = this.currentToken.value;
      this.eat('UPPER_IDENTIFIER');
      this.eat('ASSIGN');
      definitions.push(this.at<TypeBinding>({ name, typeExpr: this.typeExpr() }, defToken));

      if (this.currentToken.type !== 'COMMA') break;
      this.eat('COMMA');
      // Next binding could be another type def or a value binding
      // Use type assertion since eat() updates currentToken but TS doesn't track this
      const nextTokenType = this.currentToken.type as TokenType;
      // Allow trailing comma: check if next token is IN
      if (nextTokenType === 'IN') break;
      if (nextTokenType !== 'UPPER_IDENTIFIER') {
        // Value binding - parse remaining as let bindings
        const body = this.parseLetBindingsAfterComma();
        return this.at(this.built(nameToken, () => typeDef(definitions, body)), nameToken);
      }
    }

    this.eat('IN');
    const body = this.expr();
    return this.at(this.built(nameToken, () => typeDef(definitions, body)), nameToken);
  }

  /**
   * Parse remaining let bindings after a comma (when mixing type and value bindings)
   * Returns a LetExpr with the remaining bindings
   * Trailing commas are allowed
   */
  private parseLetBindingsAfterComma(): Expr {
    const bindings: LetBinding[] = [];

    // Parse first binding after comma
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    this.eat('ASSIGN');
    const firstValue = this.pipe();
    bindings.push({ name: firstName, value: firstValue });

    // Parse additional bindings
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token is IN
      if ((this.currentToken as Token).type === 'IN') break;
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('ASSIGN');
      const value = this.pipe();
      bindings.push({ name, value });
    }

    this.eat('IN');
    const body = this.expr();

    return letExpr(bindings, body);
  }

  /**
   * Parse a type expression: String, Int|String, Int(i | i > 0), [Int], { prop: TypeExpr, ... }
   * Handles union types: Int|String|Bool
   */
  private typeExpr(): TypeExpr {
    // Type expressions recurse through nested arrays ([[Int]]), object schemas
    // and unions. Count each level against the same guard the value grammar
    // uses, so deeply nested types raise "Maximum expression depth exceeded"
    // rather than overflowing the host call stack.
    return this.descend(() => {
      const first = this.typeExprPrimary();

      // Check for union type: Type|Type|...
      if (this.currentToken.type === 'PIPE') {
        const types: TypeExpr[] = [first];
        while (this.currentToken.type === 'PIPE') {
          this.eat('PIPE');
          types.push(this.typeExprPrimary());
        }
        return unionType(types);
      }

      return first;
    });
  }

  /**
   * Parse a primary type expression (without union)
   */
  private typeExprPrimary(): TypeExpr {
    // Check for '.' (Any type shorthand)
    if (this.currentToken.type === 'DOT') {
      this.eat('DOT');
      return typeRef('Any');
    }

    // Check for array type: [TypeExpr]
    if (this.currentToken.type === 'LBRACKET') {
      this.eat('LBRACKET');
      const elementType = this.typeExpr();
      this.eat('RBRACKET');
      return arrayType(elementType);
    }

    // Check for object schema: { prop: Type, ... }
    if (this.currentToken.type === 'LBRACE') {
      return this.typeSchemaExpr();
    }

    // Must be a type name (UPPER_IDENTIFIER)
    if (this.currentToken.type !== 'UPPER_IDENTIFIER') {
      throw new Error(
        `Expected type name, '[', or '{' at ${this.formatLocation(this.currentToken)}, got ${this.currentToken.type}`
      );
    }

    const name = this.currentToken.value;
    this.eat('UPPER_IDENTIFIER');
    const baseType = typeRef(name);

    // Check for subtype constraint: Int(i | i > 0)
    if ((this.currentToken as Token).type === 'LPAREN') {
      return this.subtypeConstraintExpr(baseType);
    }

    return baseType;
  }

  /**
   * Parse a subtype constraint: Int(i | i > 0) or Int(i | positive: i > 0, even: i % 2 == 0)
   * Called after the base type has been parsed, when we see '('
   * Supports:
   * - Single constraint: Int(i | i > 0)
   * - Labeled constraint: Int(i | positive: i > 0)
   * - Multiple constraints: Int(i | positive: i > 0, even: i % 2 == 0)
   * - String labels: Int(i | 'must be positive': i > 0)
   * - Trailing commas are allowed: Int(i | i > 0,)
   */
  private subtypeConstraintExpr(baseType: TypeExpr): TypeExpr {
    this.eat('LPAREN');

    // Parse variable name
    const varName = this.currentToken.value;
    this.eat('IDENTIFIER');

    // Expect '|' separator
    this.eat('PIPE');

    // Parse constraints (one or more, comma-separated)
    const constraints: Constraint[] = [];
    constraints.push(this.parseConstraint());

    while ((this.currentToken as Token).type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token closes the constraint
      if ((this.currentToken as Token).type === 'RPAREN') break;
      constraints.push(this.parseConstraint());
    }

    this.eat('RPAREN');

    return subtypeConstraint(baseType, varName, constraints);
  }

  /**
   * Parse a single constraint with optional label
   * Formats:
   * - condition (no label)
   * - identifier: condition
   * - 'string message': condition
   */
  private parseConstraint(): Constraint {
    // Check for label (identifier or string followed by colon)
    let label: string | undefined;

    if (this.currentToken.type === 'IDENTIFIER') {
      // Could be a label or the start of the condition
      // Look ahead: if next is COLON, it's a label
      const savedState = this.saveState();
      const potentialLabel = this.currentToken.value;
      this.eat('IDENTIFIER');

      if ((this.currentToken as Token).type === 'COLON') {
        // It's a label
        this.eat('COLON');
        label = potentialLabel;
      } else {
        // Not a label, restore and parse as expression
        this.restoreState(savedState);
      }
    } else if (this.currentToken.type === 'STRING') {
      // String label
      const savedState = this.saveState();
      const potentialLabel = this.currentToken.value;
      this.eat('STRING');

      if ((this.currentToken as Token).type === 'COLON') {
        // It's a label
        this.eat('COLON');
        label = potentialLabel;
      } else {
        // Not a label, restore and parse as expression
        this.restoreState(savedState);
      }
    }

    // Parse the constraint condition
    // Use logical_or to avoid consuming COMMA and RPAREN which delimit constraints
    const condition = this.logical_or();

    return { label, condition };
  }

  /**
   * Parse a type schema: { name: String, age: Int, nickname :? String, ... } or { name: String, ...: Int }
   * Trailing commas are allowed: { name: String, age: Int, }
   * extras:
   * - { x: Int } - closed, no extra attrs allowed
   * - { x: Int, ... } - ignored, extra attrs allowed but not included
   * - { x: Int, ...: String } - typed, extra attrs must match type
   */
  private typeSchemaExpr(): TypeExpr {
    this.eat('LBRACE');

    const properties: TypeSchemaProperty[] = [];
    let extras: 'closed' | 'ignored' | TypeExpr | undefined = undefined;

    // Handle empty schema
    if (this.currentToken.type === 'RBRACE') {
      this.eat('RBRACE');
      return typeSchema(properties, extras);
    }

    // Handle spread only: { ... } or { ...: Type }
    if (this.currentToken.type === 'RANGE_EXCL') {
      this.eat('RANGE_EXCL');
      if ((this.currentToken as Token).type === 'COLON') {
        this.eat('COLON');
        extras = this.typeExpr();
      } else {
        extras = 'ignored';
      }
      this.eat('RBRACE');
      return typeSchema(properties, extras);
    }

    // Parse first property
    const firstName = this.currentToken.value;
    this.eat('IDENTIFIER');
    this.eat('COLON');
    const firstOptional = (this.currentToken as Token).type === 'QUESTION';
    if (firstOptional) this.eat('QUESTION');
    const firstType = this.typeExpr();
    properties.push({ key: firstName, typeExpr: firstType, optional: firstOptional || undefined });

    // Parse additional properties (commas are optional, like Finitio)
    while (true) {
      // Consume optional comma
      if (this.currentToken.type === 'COMMA') {
        this.eat('COMMA');
      }

      // Check for spread operator: ... or ...: Type
      if ((this.currentToken as Token).type === 'RANGE_EXCL') {
        this.eat('RANGE_EXCL');
        if ((this.currentToken as Token).type === 'COLON') {
          this.eat('COLON');
          extras = this.typeExpr();
        } else {
          extras = 'ignored';
        }
        break; // spread must be last
      }

      // Check for another property (identifier starts next property)
      if ((this.currentToken as Token).type !== 'IDENTIFIER') {
        break; // no more properties
      }

      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('COLON');
      const optional = (this.currentToken as Token).type === 'QUESTION';
      if (optional) this.eat('QUESTION');
      const propType = this.typeExpr();
      properties.push({ key: name, typeExpr: propType, optional: optional || undefined });
    }

    this.eat('RBRACE');
    return typeSchema(properties, extras);
  }

  private ifExprParse(): Expr {
    const keyword = this.here();
    this.eat('IF');
    const condition = this.expr();
    this.eat('THEN');
    const thenBranch = this.expr();
    this.eat('ELSE');
    const elseBranch = this.expr();
    return this.at(ifExpr(condition, thenBranch, elseBranch), keyword);
  }

  /**
   * Try to parse pipe-style guard: guard(x | condition, ...)
   * Returns a lambda that checks constraints and returns the input value.
   * Returns null if not a pipe-style guard (e.g., regular function call).
   * Called from lowercase identifier parsing (when guard/check used as function name).
   */
  private tryParsePipeGuard(guardType: 'guard' | 'check'): Expr | null {
    const savedState = this.saveState();
    this.eat('LPAREN');
    return this.parsePipeGuardBody(guardType, savedState);
  }

  /**
   * Try to parse pipe-style guard body after LPAREN has been seen.
   * Called from GUARD/CHECK keyword parsing.
   * Returns null if not a valid pipe-style guard pattern.
   */
  private tryParsePipeGuardBody(guardType: 'guard' | 'check'): Expr | null {
    const savedState = this.saveState();
    this.eat('LPAREN');
    return this.parsePipeGuardBody(guardType, savedState);
  }

  /**
   * Parse the body of a pipe-style guard after LPAREN has been consumed.
   * Returns null if not a valid pattern, restoring the saved state.
   * Trailing commas are allowed: guard(i | i>0, i<0,)
   */
  private parsePipeGuardBody(guardType: 'guard' | 'check', savedState: ParserState): Expr | null {
    // Check for IDENTIFIER PIPE pattern
    if (this.currentToken.type !== 'IDENTIFIER') {
      this.restoreState(savedState);
      return null;
    }

    const varName = this.currentToken.value;
    this.eat('IDENTIFIER');

    if ((this.currentToken as Token).type !== 'PIPE') {
      this.restoreState(savedState);
      return null;
    }
    this.eat('PIPE');

    // Parse constraints (one or more, comma-separated) - reuse constraint parsing
    const constraints: Constraint[] = [];
    constraints.push(this.parseConstraint());

    while ((this.currentToken as Token).type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token closes the guard
      if ((this.currentToken as Token).type === 'RPAREN') break;
      constraints.push(this.parseConstraint());
    }

    this.eat('RPAREN');

    // Create a lambda: fn(x ~> guard constraints in x)
    // The guard body is just the variable itself (returns input if guard passes)
    const varRef = variable(varName);
    const guardBody = guardExpr(constraints, varRef, guardType);
    return lambda([varName], guardBody);
  }

  /**
   * Parse guard/check expression: guard [label:] condition[, ...] in body
   * Supports the guard...let...check...in sugar pattern
   * Trailing commas are allowed: guard age > 0, length(name) > 0, in age
   */
  private guardExprParse(guardType: 'guard' | 'check'): Expr {
    const keyword = this.here();
    this.eat(guardType === 'guard' ? 'GUARD' : 'CHECK');

    // Parse constraints (one or more, comma-separated)
    const constraints: Constraint[] = [];
    constraints.push(this.parseConstraint());

    while ((this.currentToken as Token).type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token ends constraints (IN, GUARD, CHECK)
      const nextType = (this.currentToken as Token).type;
      if (nextType === 'IN' || nextType === 'GUARD' || nextType === 'CHECK') break;
      constraints.push(this.parseConstraint());
    }

    // Check for guard...check sugar
    // guard cond check cond in body
    const tok = this.currentToken as Token;
    if (tok.type === 'GUARD' && guardType === 'guard') {
      // guard...guard sugar (nested guards)
      const inner = this.descend(() => this.guardExprParse('guard'));
      return this.at(guardExpr(constraints, inner, guardType), keyword);
    } else if (tok.type === 'CHECK') {
      // guard...check sugar: guard cond check cond in body
      const inner = this.descend(() => this.guardExprParse('check'));
      return this.at(guardExpr(constraints, inner, guardType), keyword);
    }

    this.eat('IN');
    const body = this.expr();
    return this.at(guardExpr(constraints, body, guardType), keyword);
  }

  /**
   * Parse lambda expression: fn( ~> body ) or fn( x ~> body ) or fn( x, y ~> body )
   */
  private lambdaParse(): Expr {
    const fnToken = this.here();
    this.eat('FN');
    this.eat('LPAREN');

    const params: string[] = [];

    // Check for parameterless lambda: fn( ~> body )
    if (this.currentToken.type !== 'ARROW') {
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
    }

    this.eat('ARROW');

    const body = this.expr();
    this.eat('RPAREN');

    return this.built(fnToken, () => lambda(params, body));
  }

  /**
   * Parse object literal: {key: value, key2: value2, ...}
   * Trailing commas are allowed: {a: 1, b: 2,}
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
      // Allow trailing comma: check if next token closes the object
      if ((this.currentToken as Token).type === 'RBRACE') break;
      const name = this.currentToken.value;
      this.eat('IDENTIFIER');
      this.eat('COLON');
      const value = this.expr();
      properties.push({ key: name, value });
    }

    this.eat('RBRACE');
    return objectLiteral(properties);
  }

  /**
   * Parse array literal: [expr, expr, ...]
   * Trailing commas are allowed: [1, 2, 3,]
   */
  private arrayParse(): Expr {
    this.eat('LBRACKET');

    const elements: Expr[] = [];

    // Handle empty array
    if (this.currentToken.type === 'RBRACKET') {
      this.eat('RBRACKET');
      return arrayLiteral(elements);
    }

    // Parse first element
    elements.push(this.expr());

    // Parse additional elements
    while (this.currentToken.type === 'COMMA') {
      this.eat('COMMA');
      // Allow trailing comma: check if next token closes the array
      if ((this.currentToken as Token).type === 'RBRACKET') break;
      elements.push(this.expr());
    }

    this.eat('RBRACKET');
    return arrayLiteral(elements);
  }

  /**
   * Parse datapath literal: .x.y.z or .items.0.name
   * Grammar: '.' pathSegment ('.' pathSegment)*
   * pathSegment: IDENTIFIER | NUMBER
   *
   * Note: The lexer may tokenize "0.1" as a single NUMBER token when parsing
   * consecutive numeric segments. We handle this by splitting such tokens.
   * The lexer also treats ".0" as a NUMBER token (decimal number starting with dot).
   */
  private datapathParse(): Expr {
    this.eat('DOT');

    const segments: (string | number)[] = [];

    // Parse first segment (required) - could be IDENTIFIER or NUMBER
    if (this.currentToken.type === 'IDENTIFIER') {
      segments.push(this.currentToken.value);
      this.eat('IDENTIFIER');
    } else if (this.currentToken.type === 'NUMBER') {
      // NUMBER token might contain multiple segments (e.g., "0.1" -> [0, 1])
      const numSegments = this.parseNumericPathSegments();
      if (numSegments === null || numSegments.length === 0) {
        throw new Error(`Expected identifier or number after '.' at ${this.formatLocation(this.currentToken)}`);
      }
      segments.push(...numSegments);
    } else {
      throw new Error(`Expected identifier or number after '.' at ${this.formatLocation(this.currentToken)}`);
    }

    // Parse additional segments
    this.parseAdditionalPathSegments(segments);

    return dataPath(segments);
  }

  /**
   * Parse additional path segments after the first one
   */
  private parseAdditionalPathSegments(segments: (string | number)[]): void {
    while (true) {
      // Get a fresh reference to avoid TypeScript control flow narrowing issues
      const token = this.currentToken;
      if (token.type === 'DOT') {
        this.eat('DOT');
        // After a DOT, we expect IDENTIFIER or NUMBER
        const nextToken = this.currentToken;
        if (nextToken.type === 'IDENTIFIER') {
          segments.push(nextToken.value);
          this.eat('IDENTIFIER');
        } else if (nextToken.type === 'NUMBER') {
          const numSegments = this.parseNumericPathSegments();
          if (numSegments === null || numSegments.length === 0) {
            throw new Error(`Expected identifier or number after '.' at ${this.formatLocation(this.currentToken)}`);
          }
          segments.push(...numSegments);
        } else {
          throw new Error(`Expected identifier or number after '.' at ${this.formatLocation(this.currentToken)}`);
        }
      } else if (token.type === 'NUMBER' && token.value.startsWith('.')) {
        // Handle NUMBER tokens that start with "." (e.g., ".0" tokenized as decimal)
        const numValue = token.value;
        this.eat('NUMBER');
        // Skip the leading dot and split on remaining dots
        const withoutLeadingDot = numValue.substring(1);
        const parts = withoutLeadingDot.split('.');
        for (const part of parts) {
          if (part.length > 0) {
            segments.push(parseInt(part, 10));
          }
        }
      } else {
        break;
      }
    }
  }

  /**
   * Parse path segments from a NUMBER token.
   * A NUMBER token like "0.1" in datapath context should become segments [0, 1].
   * Returns the array of integer segments, or null if not a valid NUMBER.
   */
  private parseNumericPathSegments(): number[] | null {
    if (this.currentToken.type !== 'NUMBER') {
      return null;
    }
    const tokenValue = this.currentToken.value;
    this.eat('NUMBER');

    // Split on decimal points to get individual integer segments
    const parts = tokenValue.split('.');
    return parts.filter(p => p.length > 0).map(p => parseInt(p, 10));
  }

  private expr(): Expr {
    this.depth++;
    this.checkDepth();
    try {
      // Let, if, guard, check expressions have lowest precedence
      if (this.currentToken.type === 'LET') {
        return this.letExpr();
      }
      if (this.currentToken.type === 'IF') {
        return this.ifExprParse();
      }
      // Handle guard/check: either block-style or pipe-style
      if (this.currentToken.type === 'GUARD') {
        return this.guardOrPipeGuard('guard');
      }
      if (this.currentToken.type === 'CHECK') {
        return this.guardOrPipeGuard('check');
      }
      return this.pipe();
    } finally {
      this.depth--;
    }
  }

  /**
   * Parse guard/check: detect if it's pipe-style guard(x | cond) or block-style guard cond in body
   */
  private guardOrPipeGuard(guardType: 'guard' | 'check'): Expr {
    const savedState = this.saveState();
    this.eat(guardType === 'guard' ? 'GUARD' : 'CHECK');

    // Check for pipe-style: guard(x | condition)
    if ((this.currentToken as Token).type === 'LPAREN') {
      const pipeGuard = this.tryParsePipeGuardBody(guardType);
      if (pipeGuard) {
        return pipeGuard;
      }
    }

    // Not pipe-style, restore and parse as block-style
    this.restoreState(savedState);
    return this.guardExprParse(guardType);
  }

  /**
   * Parse the import header: the imports a source may open with.
   *
   *   imports -> import*
   *   import  -> 'import' '{' name (',' name)* '}' 'from' STRING
   *            | 'import' STRING 'as' IDENTIFIER
   *
   * `import`, `from` and `as` are contextual, not reserved: they are ordinary
   * identifiers to the lexer and are only read as keywords here, at the top of
   * a source. So a program that uses one as a variable name still means what it
   * meant. The cost is that `import` followed by something else is a parse
   * error rather than a variable reference, which is the better failure: a
   * source opening on `import` is an import in every case that matters.
   */
  private importHeader(): ImportDecl[] {
    const imports: ImportDecl[] = [];

    while (this.currentToken.type === 'IDENTIFIER' && this.currentToken.value === 'import') {
      const keyword = this.currentToken;
      this.eat('IDENTIFIER');
      imports.push(this.at(this.importDecl(), keyword));
    }

    return imports;
  }

  /**
   * Parse one import, the `import` keyword already eaten.
   */
  private importDecl(): ImportDecl {
    // import './m' as r
    if ((this.currentToken as Token).type === 'STRING') {
      const path = this.currentToken.value;
      this.eat('STRING');
      this.eatContextualKeyword('as', `import '${path}'`);
      if ((this.currentToken as Token).type !== 'IDENTIFIER') {
        throw new Error(
          `Expected a lowercase name after 'as' but got ${this.currentToken.type} at ${this.formatLocation(this.currentToken)}`
        );
      }
      const alias = this.currentToken.value;
      this.eat('IDENTIFIER');
      return { path, names: [], alias };
    }

    // import { Person, double } from './m'
    if ((this.currentToken as Token).type !== 'LBRACE') {
      throw new Error(
        `Expected '{' or a module path after 'import' but got ${this.currentToken.type} at ${this.formatLocation(this.currentToken)}`
      );
    }
    this.eat('LBRACE');

    const names: string[] = [];
    while ((this.currentToken as Token).type !== 'RBRACE') {
      const token = this.currentToken as Token;
      if (token.type !== 'IDENTIFIER' && token.type !== 'UPPER_IDENTIFIER') {
        throw new Error(
          `Expected a name to import but got ${token.type} at ${this.formatLocation(token)}`
        );
      }
      names.push(token.value);
      this.eat(token.type);
      if ((this.currentToken as Token).type === 'COMMA') {
        this.eat('COMMA');
      } else {
        break;
      }
    }
    this.eat('RBRACE');

    if (names.length === 0) {
      throw new Error(
        `An import names at least one thing to import at ${this.formatLocation(this.currentToken)}`
      );
    }

    this.eatContextualKeyword('from', 'an import list');
    if ((this.currentToken as Token).type !== 'STRING') {
      throw new Error(
        `Expected a module path after 'from' but got ${this.currentToken.type} at ${this.formatLocation(this.currentToken)}`
      );
    }
    const path = this.currentToken.value;
    this.eat('STRING');
    return { path, names };
  }

  /**
   * Refuse an import written after the header.
   *
   * An import declares what the whole source may use, so it comes first. Said
   * here rather than left to the expression grammar, which would otherwise
   * report the `{` of an import list as a stray expression.
   */
  private refuseLateImport(): void {
    const token = this.currentToken;
    if (token.type === 'IDENTIFIER' && token.value === 'import') {
      throw new Error(
        `An import comes before the type definitions and the expression, at ${this.formatLocation(token)}`
      );
    }
  }

  /**
   * Eat a word that is a keyword only here — `from` and `as`, which the lexer
   * hands over as plain identifiers.
   */
  private eatContextualKeyword(word: string, after: string): void {
    const token = this.currentToken as Token;
    if (token.type !== 'IDENTIFIER' || token.value !== word) {
      throw new Error(
        `Expected '${word}' after ${after} but got ${token.type} at ${this.formatLocation(token)}`
      );
    }
    this.eat('IDENTIFIER');
  }

  /**
   * Parse the type prelude: the type definitions a source may open with.
   *
   *   typePrelude -> (UPPER_IDENTIFIER '=' typeExpr ','?)*
   *
   * `Name =` is the only shape a definition can take, and nothing in the value
   * grammar starts that way, so one token of lookahead tells a definition from
   * the expression that follows it.
   */
  private typePrelude(): TypeBinding[] {
    const bindings: TypeBinding[] = [];

    while ((this.currentToken as Token).type === 'UPPER_IDENTIFIER') {
      const saved = this.saveState();
      const nameToken = this.here();
      const name = this.currentToken.value;
      this.eat('UPPER_IDENTIFIER');

      if ((this.currentToken as Token).type !== 'ASSIGN') {
        // An expression opening on an uppercase name, such as `TODAY` or a
        // type selector call. Give the token back and stop.
        this.restoreState(saved);
        break;
      }
      this.eat('ASSIGN');

      // Positioned at its name: a name defined twice is reported where the
      // second one is written, and the prelude of a module names its file.
      bindings.push(this.at<TypeBinding>({ name, typeExpr: this.typeExpr() }, nameToken));

      // The comma between two definitions is optional, as it is between two
      // schema properties.
      if ((this.currentToken as Token).type === 'COMMA') {
        this.eat('COMMA');
      }
    }

    return bindings;
  }

  parse(): Expr {
    const imports = this.importHeader();
    if (imports.length > 0) {
      throw new Error(
        `Cannot import '${imports[0].path}': reading a module needs a module loader, and this host reads one source`
      );
    }
    const prelude = this.typePrelude();
    this.refuseLateImport();
    if (prelude.length > 0 && this.currentToken.type === 'EOF') {
      throw new Error(
        `Expected an expression after the type definitions at ${this.formatLocation(this.currentToken)}`
      );
    }
    const result = this.expr();
    if (this.currentToken.type !== 'EOF') {
      // A source is one expression. Saying where it ended beats "expected
      // EOF": what is left over is usually a second expression, or a stray
      // bracket, and the column points at it.
      throw new Error(
        `Unexpected ${this.currentToken.type} ${TRAILING_INPUT} at ${this.formatLocation(this.currentToken)}`
      );
    }
    return withTypeDefs(prelude, result);
  }

  /**
   * Parse the header alone — the imports, then the type definitions — and say
   * where the rest of the source starts.
   *
   * The header declares what a whole source may use, so it has to be lifted
   * off the top before the expression under it can be read — and before each
   * line can be read on its own, in `--lines` mode. See `splitProgramHeader`.
   */
  parseProgramHeader(): { imports: ImportDecl[]; typeDefs: TypeBinding[]; offset: number } {
    const imports = this.importHeader();
    const typeDefs = this.typePrelude();
    this.refuseLateImport();
    return { imports, typeDefs, offset: this.currentToken.position };
  }

  /**
   * Parse a standalone type expression, as in the body of a `let X = … in`
   * binding. Lets a host declare the shape of `_` without wrapping it in a
   * throwaway expression.
   */
  parseTypeExpr(): TypeExpr {
    const result = this.typeExpr();
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

/**
 * A source split into its header and what follows it.
 */
export interface ProgramHeaderSplit {
  /** The imports the source opens with, in order. */
  imports: ImportDecl[];
  /** The type definitions that follow them, in order. */
  typeDefs: TypeBinding[];
  /**
   * What follows the header, with the header region replaced by whitespace
   * so that every remaining line keeps its line and column numbers.
   */
  body: string;
}

/**
 * Lift the header — the imports, then the type prelude — off the top of a
 * source.
 *
 * The header declares what the whole source may use, while the source under it
 * is one expression (or, by test convention, one per line). Reading the two
 * apart is what lets a host scope the body under what the header declares. A
 * source with no header comes back with nothing declared and a body that still
 * parses the same.
 */
export function splitProgramHeader(source: string, options: ParserOptions = {}): ProgramHeaderSplit {
  const parser = new Parser(source, options);
  const { imports, typeDefs, offset } = parser.parseProgramHeader();
  const blanked = source.slice(0, offset).replace(/[^\n]/g, ' ');
  return { imports, typeDefs, body: blanked + source.slice(offset) };
}

/**
 * Parse a type expression string, such as `{ total: Int, lines: [Int] }`.
 *
 * This is the type half of the grammar on its own, so a host that already
 * knows the shape of its data can hand it to the type checker without the
 * author restating it. There is one spelling of a schema, not two.
 */
export function parseTypeExpr(input: string, options: ParserOptions = {}): TypeExpr {
  const parser = new Parser(input, options);
  return parser.parseTypeExpr();
}
