import { parser } from "./syntax.grammar"
import {
  LRLanguage, LanguageSupport,
  indentNodeProp, foldNodeProp, foldInside, delimitedIndent
} from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import {
  completeFromList, Completion
} from "@codemirror/autocomplete"

export const eloLanguage = LRLanguage.define({
  name: "elo",
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        ObjectLiteral: delimitedIndent({ closing: "}" }),
        ArrayLiteral: delimitedIndent({ closing: "]" }),
        ArgList: delimitedIndent({ closing: ")" }),
        LambdaExpression: delimitedIndent({ closing: ")" }),
        TypeSchema: delimitedIndent({ closing: "}" }),
      }),
      foldNodeProp.add({
        ObjectLiteral: foldInside,
        ArrayLiteral: foldInside,
        LambdaExpression: foldInside,
        TypeSchema: foldInside,
      }),
      styleTags({
        "let in fn": t.definitionKeyword,
        "if then else": t.controlKeyword,
        "guard check": t.controlKeyword,
        "and or not": t.operatorKeyword,
        Boolean: t.bool,
        Null: t.null,
        Number: t.number,
        String: t.string,
        DateLiteral: t.special(t.literal),
        DateTimeLiteral: t.special(t.literal),
        DurationLiteral: t.special(t.number),
        TemporalKeyword: t.standard(t.variableName),
        TypeName: t.typeName,
        "Variable/Identifier": t.variableName,
        "FunctionCall/Identifier": t.function(t.variableName),
        PropertyName: t.propertyName,
        LineComment: t.lineComment,
        "CompareOp": t.compareOperator,
        "ArithOp": t.arithmeticOperator,
        "And Or": t.logicOperator,
        "Not": t.logicOperator,
        "PipeOp": t.operator,
        "Arrow": t.punctuation,
        "^": t.operator,
        "( )": t.paren,
        "[ ]": t.squareBracket,
        "{ }": t.brace,
        ", ;": t.separator,
        ":": t.punctuation,
        ".": t.derefOperator,
        "=": t.definitionOperator,
        "|": t.operator,
        "?": t.punctuation,
        "...": t.punctuation,
      }),
    ]
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", "'"] },
  }
})

const stdlibFunctions: Completion[] = [
  // Math
  { label: "abs", type: "function", info: "Absolute value" },
  { label: "round", type: "function", info: "Round to nearest integer" },
  { label: "floor", type: "function", info: "Round down to integer" },
  { label: "ceil", type: "function", info: "Round up to integer" },
  // Date/Time extraction
  { label: "year", type: "function", info: "Extract year" },
  { label: "month", type: "function", info: "Extract month" },
  { label: "day", type: "function", info: "Extract day" },
  { label: "hour", type: "function", info: "Extract hour" },
  { label: "minute", type: "function", info: "Extract minute" },
  // Duration conversion
  { label: "inYears", type: "function", info: "Convert duration to years" },
  { label: "inQuarters", type: "function", info: "Convert duration to quarters" },
  { label: "inMonths", type: "function", info: "Convert duration to months" },
  { label: "inWeeks", type: "function", info: "Convert duration to weeks" },
  { label: "inDays", type: "function", info: "Convert duration to days" },
  { label: "inHours", type: "function", info: "Convert duration to hours" },
  { label: "inMinutes", type: "function", info: "Convert duration to minutes" },
  { label: "inSeconds", type: "function", info: "Convert duration to seconds" },
  // String
  { label: "length", type: "function", info: "String or array length" },
  { label: "upper", type: "function", info: "Convert to uppercase" },
  { label: "lower", type: "function", info: "Convert to lowercase" },
  { label: "trim", type: "function", info: "Trim whitespace" },
  { label: "concat", type: "function", info: "Concatenate strings" },
  { label: "substring", type: "function", info: "Extract substring(str, start, length)" },
  { label: "indexOf", type: "function", info: "Find index of substring" },
  { label: "replace", type: "function", info: "Replace first occurrence" },
  { label: "replaceAll", type: "function", info: "Replace all occurrences" },
  { label: "startsWith", type: "function", info: "Check if string starts with prefix" },
  { label: "endsWith", type: "function", info: "Check if string ends with suffix" },
  { label: "contains", type: "function", info: "Check if string contains substring" },
  { label: "isEmpty", type: "function", info: "Check if string or array is empty" },
  { label: "padStart", type: "function", info: "Pad string start" },
  { label: "padEnd", type: "function", info: "Pad string end" },
  // Array
  { label: "count", type: "function", info: "Count array elements" },
  { label: "sum", type: "function", info: "Sum array elements" },
  { label: "at", type: "function", info: "Get element at index" },
  { label: "first", type: "function", info: "Get first element" },
  { label: "last", type: "function", info: "Get last element" },
  { label: "map", type: "function", info: "Transform each element" },
  { label: "filter", type: "function", info: "Filter elements by predicate" },
  { label: "reduce", type: "function", info: "Reduce array to single value" },
  { label: "any", type: "function", info: "Check if any element matches" },
  { label: "all", type: "function", info: "Check if all elements match" },
  // Data
  { label: "fetch", type: "function", info: "Fetch data with path/schema" },
  // Type
  { label: "typeOf", type: "function", info: "Get type name as string" },
  { label: "isNull", type: "function", info: "Check if value is null" },
  { label: "fail", type: "function", info: "Raise an error with message" },
  // Interval
  { label: "start", type: "function", info: "Get interval start datetime" },
  { label: "end", type: "function", info: "Get interval end datetime" },
  { label: "union", type: "function", info: "Union of two intervals" },
  { label: "intersection", type: "function", info: "Intersection of two intervals" },
  // Testing
  { label: "assert", type: "function", info: "Assert a condition is true" },
  { label: "assertFails", type: "function", info: "Assert that a function raises" },
]

const keywordCompletions: Completion[] = [
  { label: "let", type: "keyword" },
  { label: "in", type: "keyword" },
  { label: "if", type: "keyword" },
  { label: "then", type: "keyword" },
  { label: "else", type: "keyword" },
  { label: "fn", type: "keyword" },
  { label: "and", type: "keyword" },
  { label: "or", type: "keyword" },
  { label: "not", type: "keyword" },
  { label: "guard", type: "keyword" },
  { label: "check", type: "keyword" },
  { label: "true", type: "constant" },
  { label: "false", type: "constant" },
  { label: "null", type: "constant" },
]

const temporalCompletions: Completion[] = [
  { label: "NOW", type: "constant", info: "Current datetime" },
  { label: "TODAY", type: "constant", info: "Current date" },
  { label: "TOMORROW", type: "constant", info: "Tomorrow's date" },
  { label: "YESTERDAY", type: "constant", info: "Yesterday's date" },
  { label: "SOD", type: "constant", info: "Start of day" },
  { label: "EOD", type: "constant", info: "End of day" },
  { label: "SOW", type: "constant", info: "Start of week" },
  { label: "EOW", type: "constant", info: "End of week" },
  { label: "SOM", type: "constant", info: "Start of month" },
  { label: "EOM", type: "constant", info: "End of month" },
  { label: "SOQ", type: "constant", info: "Start of quarter" },
  { label: "EOQ", type: "constant", info: "End of quarter" },
  { label: "SOY", type: "constant", info: "Start of year" },
  { label: "EOY", type: "constant", info: "End of year" },
  { label: "BOT", type: "constant", info: "Beginning of time" },
  { label: "EOT", type: "constant", info: "End of time" },
]

const typeCompletions: Completion[] = [
  { label: "String", type: "type", info: "String type / selector" },
  { label: "Int", type: "type", info: "Integer type / selector" },
  { label: "Float", type: "type", info: "Float type / selector" },
  { label: "Bool", type: "type", info: "Boolean type / selector" },
  { label: "Date", type: "type", info: "Date type / selector" },
  { label: "Datetime", type: "type", info: "Datetime type / selector" },
  { label: "Duration", type: "type", info: "Duration type / selector" },
  { label: "Interval", type: "type", info: "Interval type / selector" },
  { label: "Null", type: "type", info: "Null type" },
  { label: "Data", type: "type", info: "Data type" },
  { label: "Any", type: "type", info: "Any type (wildcard)" },
]

const eloCompletion = completeFromList([
  ...stdlibFunctions,
  ...keywordCompletions,
  ...temporalCompletions,
  ...typeCompletions,
])

/**
 * Elo language support for CodeMirror 6.
 *
 * Provides syntax highlighting, bracket matching, code folding,
 * indentation, comment toggling, and autocompletion.
 */
export function elo(): LanguageSupport {
  return new LanguageSupport(eloLanguage, [
    eloLanguage.data.of({ autocomplete: eloCompletion }),
  ])
}
