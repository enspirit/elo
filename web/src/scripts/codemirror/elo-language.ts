/**
 * CodeMirror 6 language support for Elo
 */
import { LanguageSupport, StreamLanguage } from "@codemirror/language";

const KEYWORDS = [
  "let",
  "in",
  "if",
  "then",
  "else",
  "fn",
  "and",
  "or",
  "not",
  "assert",
  "guard",
  "check",
];
const BOOLEANS = ["true", "false"];
const TEMPORAL_KEYWORDS = [
  "NOW",
  "TODAY",
  "TOMORROW",
  "YESTERDAY",
  "SOD",
  "EOD",
  "SOW",
  "EOW",
  "SOM",
  "EOM",
  "SOQ",
  "EOQ",
  "SOY",
  "EOY",
];
const STDLIB_FUNCTIONS = [
  "abs",
  "round",
  "floor",
  "ceil",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "length",
  "upper",
  "lower",
  "trim",
  "concat",
  "substring",
  "indexOf",
  "replace",
  "replaceAll",
  "startsWith",
  "endsWith",
  "contains",
  "isEmpty",
  "padStart",
  "padEnd",
  "typeOf",
  "isNull",
];

interface EloState {
  inString: boolean;
}

const eloStreamParser = StreamLanguage.define<EloState>({
  name: "elo",
  startState: () => ({ inString: false }),
  token(stream, state) {
    // Handle string continuation
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "'") {
          state.inString = false;
          return "string";
        }
        if (ch === "\\") {
          stream.next(); // Skip escaped char
        }
      }
      return "string";
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    // String literals
    if (stream.eat("'")) {
      state.inString = true;
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "'") {
          state.inString = false;
          return "string";
        }
        if (ch === "\\") {
          stream.next();
        }
      }
      return "string";
    }

    // DateTime literal (must check before Date)
    if (stream.match(/^[DT]\d{4}-\d{2}-\d{2}T[\d:]+Z?/)) {
      return "atom";
    }

    // Date literal
    if (stream.match(/^D\d{4}-\d{2}-\d{2}/)) {
      return "atom";
    }

    // Duration literal
    if (
      stream.match(/^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?/)
    ) {
      if (stream.current().length > 1) {
        return "number";
      }
    }

    // Numbers
    if (stream.match(/^\d+(\.\d+)?/)) {
      return "number";
    }

    // Multi-character operators
    if (
      stream.match("~>") ||
      stream.match("...") ||
      stream.match("..") ||
      stream.match("<=") ||
      stream.match(">=") ||
      stream.match("==") ||
      stream.match("!=") ||
      stream.match("&&") ||
      stream.match("||")
    ) {
      return "operator";
    }

    // Identifiers and keywords
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current();
      if (KEYWORDS.includes(word)) {
        return "keyword";
      }
      if (BOOLEANS.includes(word)) {
        return "atom";
      }
      if (TEMPORAL_KEYWORDS.includes(word)) {
        return "keyword";
      }
      if (STDLIB_FUNCTIONS.includes(word)) {
        return "variableName.function";
      }
      return "variableName";
    }

    // Single-character operators
    if (stream.eat(/[+\-*/%^<>=!|]/)) {
      return "operator";
    }

    // Punctuation
    if (stream.eat(/[(){},:\.]/)) {
      return "punctuation";
    }

    // Skip unknown character
    stream.next();
    return null;
  },
});

export function elo(): LanguageSupport {
  return new LanguageSupport(eloStreamParser);
}
