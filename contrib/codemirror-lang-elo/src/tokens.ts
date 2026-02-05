import { ExternalTokenizer } from "@lezer/lr"
import {
  DateLiteral, DateTimeLiteral, DurationLiteral,
  TemporalKeyword, TypeName
} from "./syntax.grammar.terms"

const TEMPORAL_KEYWORDS = new Set([
  'NOW', 'TODAY', 'TOMORROW', 'YESTERDAY',
  'SOD', 'EOD', 'SOW', 'EOW', 'SOM', 'EOM', 'SOQ', 'EOQ', 'SOY', 'EOY',
  'BOT', 'EOT'
])

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57 // 0-9
}

function isAlphaNum(ch: number): boolean {
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || // A-Z, a-z
    isDigit(ch) || ch === 95 // 0-9, _
}

function isUpperCase(ch: number): boolean {
  return ch >= 65 && ch <= 90 // A-Z
}

const D = 68 // 'D'
const P = 80 // 'P'
const T = 84 // 'T'

// Read a full identifier word and return its length
function wordLength(input: { peek: (offset: number) => number }): number {
  let offset = 0
  while (true) {
    const ch = input.peek(offset)
    if (ch < 0 || !isAlphaNum(ch)) break
    offset++
  }
  return offset
}

// Read a word string
function readWord(input: { peek: (offset: number) => number }, len: number): string {
  let word = ""
  for (let i = 0; i < len; i++) {
    word += String.fromCharCode(input.peek(i))
  }
  return word
}

export const dateLiterals = new ExternalTokenizer((input) => {
  const ch = input.peek(0)
  if (ch < 0 || !isUpperCase(ch)) return

  // D-prefix: Date or DateTime literal
  if (ch === D && isDigit(input.peek(1))) {
    let offset = 1

    // Read YYYY
    for (let i = 0; i < 4; i++) {
      if (!isDigit(input.peek(offset))) return
      offset++
    }
    // -
    if (input.peek(offset) !== 45) return // '-'
    offset++
    // MM
    for (let i = 0; i < 2; i++) {
      if (!isDigit(input.peek(offset))) return
      offset++
    }
    // -
    if (input.peek(offset) !== 45) return // '-'
    offset++
    // DD
    for (let i = 0; i < 2; i++) {
      if (!isDigit(input.peek(offset))) return
      offset++
    }

    // Check for time part (T)
    if (input.peek(offset) === T) {
      offset++
      // Read time digits and colons: HH:MM:SS
      while (isDigit(input.peek(offset)) || input.peek(offset) === 58) { // 58 = ':'
        offset++
      }
      // Optional fractional seconds (.123)
      if (input.peek(offset) === 46) { // '.'
        offset++
        while (isDigit(input.peek(offset))) offset++
      }
      // Optional timezone: Z or +/-HH:MM
      const tz = input.peek(offset)
      if (tz === 90) { // 'Z'
        offset++
      } else if (tz === 43 || tz === 45) { // '+' or '-'
        offset++
        while (isDigit(input.peek(offset)) || input.peek(offset) === 58) offset++
      }
      input.acceptToken(DateTimeLiteral, offset)
    } else {
      input.acceptToken(DateLiteral, offset)
    }
    return
  }

  // P-prefix: Duration literal
  if (ch === P) {
    let offset = 1
    const next = input.peek(offset)

    // P must be followed by a digit or T (for PT1H)
    if (isDigit(next) || next === T) {
      let hasContent = false

      // Read date components: digits followed by Y/M/W/D
      while (true) {
        const c = input.peek(offset)
        if (c === T) break // time separator
        if (isDigit(c)) {
          offset++
          while (isDigit(input.peek(offset))) offset++
          const comp = input.peek(offset)
          if (comp === 89 || comp === 77 || comp === 87 || comp === 68) { // Y, M, W, D
            offset++
            hasContent = true
          } else {
            break
          }
        } else {
          break
        }
      }

      // Check for T (time separator)
      if (input.peek(offset) === T) {
        offset++
        while (true) {
          const c = input.peek(offset)
          if (isDigit(c)) {
            offset++
            while (isDigit(input.peek(offset))) offset++
            if (input.peek(offset) === 46) { // '.'
              offset++
              while (isDigit(input.peek(offset))) offset++
            }
            const comp = input.peek(offset)
            if (comp === 72 || comp === 77 || comp === 83) { // H, M, S
              offset++
              hasContent = true
            } else {
              break
            }
          } else {
            break
          }
        }
      }

      if (hasContent) {
        input.acceptToken(DurationLiteral, offset)
        return
      }
    }
    // Fall through to TypeName
  }

  // Read the full uppercase identifier
  const len = wordLength(input)
  if (len === 0) return

  const word = readWord(input, len)

  if (TEMPORAL_KEYWORDS.has(word)) {
    input.acceptToken(TemporalKeyword, len)
  } else {
    input.acceptToken(TypeName, len)
  }
})
