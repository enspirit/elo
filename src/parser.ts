import { Expr, literal, variable, binary, unary } from './ast';

/**
 * Token types
 */
type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'CARET'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenizer for arithmetic expressions
 */
class Lexer {
  private input: string;
  private position: number = 0;
  private current: string;

  constructor(input: string) {
    this.input = input;
    this.current = input[0] || '';
  }

  private advance(): void {
    this.position++;
    this.current = this.position < this.input.length ? this.input[this.position] : '';
  }

  private skipWhitespace(): void {
    while (this.current && /\s/.test(this.current)) {
      this.advance();
    }
  }

  private readNumber(): string {
    let num = '';
    while (this.current && /[0-9.]/.test(this.current)) {
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

    // Identifiers (variables)
    if (/[a-zA-Z_]/.test(this.current)) {
      return { type: 'IDENTIFIER', value: this.readIdentifier(), position: pos };
    }

    // Operators and punctuation
    const char = this.current;
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
      default:
        throw new Error(`Unexpected character '${char}' at position ${pos}`);
    }
  }
}

/**
 * Recursive descent parser for arithmetic expressions
 *
 * Grammar:
 *   expr    -> term (('+' | '-') term)*
 *   term    -> factor (('*' | '/' | '%') factor)*
 *   factor  -> power
 *   power   -> unary ('^' unary)*
 *   unary   -> ('+' | '-') unary | primary
 *   primary -> NUMBER | IDENTIFIER | '(' expr ')'
 */
export class Parser {
  private lexer: Lexer;
  private currentToken: Token;

  constructor(input: string) {
    this.lexer = new Lexer(input);
    this.currentToken = this.lexer.nextToken();
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

    if (token.type === 'IDENTIFIER') {
      this.eat('IDENTIFIER');
      return variable(token.value);
    }

    if (token.type === 'LPAREN') {
      this.eat('LPAREN');
      const expr = this.expr();
      this.eat('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token ${token.type} at position ${token.position}`);
  }

  private unary(): Expr {
    if (this.currentToken.type === 'PLUS') {
      this.eat('PLUS');
      return unary('+', this.unary());
    }

    if (this.currentToken.type === 'MINUS') {
      this.eat('MINUS');
      return unary('-', this.unary());
    }

    return this.primary();
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

  private expr(): Expr {
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

  parse(): Expr {
    const result = this.expr();
    this.eat('EOF');
    return result;
  }
}

/**
 * Parse an arithmetic expression string into an AST
 */
export function parse(input: string): Expr {
  const parser = new Parser(input);
  return parser.parse();
}
