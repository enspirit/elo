/**
 * highlight.js language definition for Elo
 *
 * @see https://elo-lang.org
 */
module.exports = function(hljs) {
  const KEYWORDS = {
    keyword: 'let in if then else fn guard check and or not',
    literal: 'true false null',
    built_in:
      'NOW TODAY TOMORROW YESTERDAY BOT EOT ' +
      'SOD EOD SOW EOW SOM EOM SOQ EOQ SOY EOY'
  };

  const STDLIB = {
    scope: 'title.function.invoke',
    match: /\b(?:abs|round|floor|ceil|upper|lower|trim|trimStart|trimEnd|contains|indexOf|startsWith|endsWith|substring|replace|replaceAll|reverse|extract|padStart|padEnd|split|length|isEmpty|isBlank|concat|at|first|last|find|count|sum|avg|min|max|join|map|filter|sort|sortBy|unique|flat|reduce|any|all|typeOf|isNull|isNotNull|fetch|patch|merge|deepMerge|assert|assertFails|fail|startOfDay|endOfDay|startOfWeek|endOfWeek|startOfMonth|endOfMonth|startOfQuarter|endOfQuarter|startOfYear|endOfYear|inYears|inQuarters|inMonths|inWeeks|inDays|inHours|inMinutes|inSeconds|year|month|day|hour|minute|start|end|union|intersection)\b/
  };

  const TYPE_SELECTORS = {
    scope: 'type',
    match: /\b(?:Int|Float|Bool|String|Date|Datetime|Duration|Interval|Data|Null|Any)\b/
  };

  const DATAPATH = {
    scope: 'variable',
    match: /\.[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*/
  };

  const NUMBER = {
    scope: 'number',
    variants: [
      { match: /\b\d+\.\d+\b/ },
      { match: /\b\d+\b/ },
      { match: /\.\d+\b/ }
    ]
  };

  const STRING = {
    scope: 'string',
    begin: "'",
    end: "'",
    contains: [
      {
        scope: 'char.escape',
        match: /\\[\\ntr']/
      }
    ]
  };

  const COMMENT = hljs.COMMENT('#', '$');

  const DATE_LITERAL = {
    scope: 'number',
    match: /\bD\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?\b/
  };

  const DURATION_LITERAL = {
    scope: 'number',
    match: /\bP(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?\b/
  };

  const PIPE = {
    scope: 'punctuation',
    match: /\|>/
  };

  const LAMBDA_ARROW = {
    scope: 'punctuation',
    match: /~>/
  };

  const RANGE = {
    scope: 'punctuation',
    match: /\.{2,3}/
  };

  const OPERATOR = {
    scope: 'operator',
    match: /[!=<>]=?|&&|\|\||[+\-*/%^!]/
  };

  return {
    name: 'Elo',
    aliases: ['elo'],
    case_insensitive: false,
    keywords: KEYWORDS,
    contains: [
      COMMENT,
      STRING,
      DATE_LITERAL,
      DURATION_LITERAL,
      TYPE_SELECTORS,
      STDLIB,
      NUMBER,
      PIPE,
      LAMBDA_ARROW,
      RANGE,
      OPERATOR,
      DATAPATH
    ]
  };
};
