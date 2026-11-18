/**
 * The plan: a form as plain JSON, and everything needed to read one.
 *
 * A plan is what is left of a schema once Elo has read it: a tree of things to
 * ask for, with each constraint reduced to what a form can say about it. It
 * holds no syntax tree and no code, so it can be made on a server, sent as
 * JSON, and turned into a form by a page that carries neither Elo nor Luxon.
 *
 * Nothing here imports anything, touches the DOM, or evaluates a string.
 */

export type Kind =
  | 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'datetime' | 'duration'
  | 'any' | 'data' | 'tuple' | 'array' | 'union'
  /** Not an Elo type: "ask for a JSON file", the fallback. */
  | 'json';

export type Cmp = '>' | '>=' | '<' | '<=' | '==' | '!=';

/** A constant a constraint compares against. */
export type PlanScalar =
  | { t: 'number'; v: number }
  | { t: 'text'; v: string }
  /** A date or a datetime, in ISO 8601. `keyword` when it is `TODAY` or `NOW`: the reader's own, not the planner's. */
  | { t: 'time'; v?: string; keyword?: 'TODAY' | 'NOW' }
  /** `ms` is the length used to compare two durations; `parts` is what to say (`{ days: 1, hours: 12 }`). */
  | { t: 'duration'; v: string; ms: number; parts: Record<string, number> };

/** One `and`-ed condition of a constraint, as far as it could be read. */
export type Atom =
  | { a: 'cmp'; op: Cmp; x: PlanScalar }
  | { a: 'length'; op: Cmp; n: number }
  | { a: 'filled' }
  | { a: 'oneOf'; values: (string | number)[] };

/** One subtype constraint. */
export interface PlanRule {
  /** What a set of checks knows this rule by. */
  id: number;
  label?: string;
  /** One entry per `and`-ed condition, in order; null where the condition could not be read. */
  atoms: (Atom | null)[];
  /** The condition as Elo source, when it can be printed back. */
  source?: string;
}

export interface PlanNode {
  kind: Kind;
  /** What a set of checks knows this position's type by. Absent on synthetic nodes. */
  id?: number;
  /** The outermost alias this position was written as, e.g. `Person`. */
  alias?: string;
  /** Every alias on the way down to the underlying type, outermost first: `Price`, then `Money`. */
  aliases?: string[];
  /** Every constraint that applies here, innermost first (the order Elo checks them in). */
  rules: PlanRule[];
  /** `T|Null`: no value is a value. */
  nullable?: boolean;
  /** A text box standing for `Int|String`-like unions: Elo picks the reading. */
  textual?: boolean;
  props?: { key: string; optional: boolean; node: PlanNode }[];
  extras?: 'closed' | 'ignored' | PlanNode;
  element?: PlanNode;
  alts?: PlanNode[];
  /** A fixed label, for synthetic alternatives. */
  label?: string;
}

/** A whole form, as JSON. */
export interface Plan {
  /** The format of this object. */
  version: 1;
  /** The name of the type the form is for, when it has one. */
  name?: string;
  root: PlanNode;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/**
 * Fill a message's `{placeholders}` in. The values are text and stay text: neither `$&` nor a
 * `{placeholder}` inside one means anything.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, name) =>
    (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : all));
}

/** "be at least 1" + "be at most 10" -> "be at least 1 and at most 10". */
export function joinPhrases(parts: string[], and: string): string {
  const unique = [...new Set(parts)];
  return unique
    .map((p, i) => {
      const verb = unique[0].split(' ')[0] + ' ';
      return i > 0 && p.startsWith(verb) ? p.slice(verb.length) : p;
    })
    .join(and);
}

const words = (label: string) =>
  label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Simplifying unions
// ---------------------------------------------------------------------------

const isPlain = (m: PlanNode, ...kinds: Kind[]) => kinds.includes(m.kind) && m.rules.length === 0;

/**
 * Turn a union into the simplest thing that asks for the same values.
 *
 *  - `T|Null` is T, where leaving it empty means null.
 *  - `Int|Float` is one number box: a whole number is read as the Int.
 *  - `Int|String` is one text box: Elo reads "42" as the Int and the rest as text.
 *  - anything else stays a choice between alternatives.
 */
export function simplify(m: PlanNode): PlanNode {
  if (m.kind !== 'union') return m;
  const alts = m.alts!.filter((a) => !isPlain(a, 'null'));
  const nullable = alts.length < m.alts!.length || undefined;
  // The check that counts is the union's own: `T|Null`, not `T`.
  const carry = { id: m.id, nullable, label: m.label };
  if (alts.length === 0) return { ...m, kind: 'null', alts: undefined };
  if (alts.length === 1) {
    const only = simplify(alts[0]);
    return {
      ...only, ...carry, nullable: nullable || only.nullable, alias: m.alias ?? only.alias,
      aliases: [...(m.aliases ?? []), ...(only.aliases ?? [])], rules: [...only.rules, ...m.rules],
    };
  }
  if (alts.every((a) => isPlain(a, 'int', 'float'))) {
    return { kind: alts.every((a) => a.kind === 'int') ? 'int' : 'float', ...carry, alias: m.alias, aliases: m.aliases, rules: m.rules };
  }
  // Only when String comes last: `String|Int` reads a typed 42 as text, so the Int needs its own box.
  if (alts.every((a) => isPlain(a, 'int', 'float', 'string')) && alts.findIndex((a) => a.kind === 'string') === alts.length - 1) {
    return { kind: 'string', textual: true, ...carry, alias: m.alias, aliases: m.aliases, rules: m.rules };
  }
  return { ...m, alts, nullable };
}

// ---------------------------------------------------------------------------
// Checks: who decides whether a value is accepted
// ---------------------------------------------------------------------------

export type Check =
  | { ok: true; value: unknown }
  | { ok: false; path: string; kind: string; label?: string; message: string };

/**
 * Elo's verdicts, wherever they come from: compiled in the page, compiled ahead of time, or
 * nowhere at all. A form asks; it never decides.
 */
export interface Checker {
  /** False when nothing is checked here: shapes are right, constraints are somebody else's to enforce. */
  enforced: boolean;
  /** Is there a check for this node? */
  has(id: number | undefined): boolean;
  /** `value |> Type` for the type of one node. `input` is what `_` means inside constraints. */
  check(id: number, value: unknown, input: unknown): Check;
  /**
   * Does a value pass one rule taken alone — or, with `part`, one `and`-ed condition of it?
   * Undefined when that cannot be told.
   */
  passes(rule: number, part: number | undefined, value: unknown, input: unknown): boolean | undefined;
}

/** No checks at all: what a page has when validation happens elsewhere. */
export const noChecks: Checker = {
  enforced: false,
  has: () => false,
  check: (_id, value) => ({ ok: true, value }),
  passes: () => undefined,
};

/** Run one of Elo's compiled functions and report what it says as a `Check`. */
export function verdict(run: () => unknown): Check {
  try {
    return { ok: true, value: run() };
  } catch (e: any) {
    const text = String(e?.message ?? e);
    const path = typeof e?.path === 'string' && e.path ? e.path : '.';
    // Elo prefixes its message with the path; the path is reported apart.
    const message = text.startsWith(path + ': ') ? text.slice(path.length + 2) : text;
    return { ok: false, path, kind: e?.kind ?? 'error', label: e?.label ?? undefined, message };
  }
}

/**
 * Checks compiled ahead of time: what the module written by `compileChecks` exports.
 *
 * Each program is Elo's own output for a group of types: given the form's whole value (`_`), it
 * returns one function per type. `nodes` and `rules` say which function answers for which id.
 */
export interface CompiledChecks {
  version: 1;
  programs: ((input: unknown) => ((value: unknown) => unknown)[])[];
  nodes: Record<string, [program: number, index: number]>;
  /** By rule id, and by `id.part` for one `and`-ed condition of a rule. */
  rules: Record<string, [program: number, index: number]>;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** A checker over checks compiled ahead of time. Nothing is evaluated from text. */
export function checkerFrom(checks: CompiledChecks): Checker {
  if (!checks || checks.version !== 1 || !Array.isArray(checks.programs)) {
    throw new Error('Not a set of checks made by compileChecks().');
  }
  // A form checks many nodes against one value: a program is run once per value, not once per node.
  const live = checks.programs.map(() => ({ input: noChecks as unknown, fns: undefined as ((v: unknown) => unknown)[] | undefined }));
  const call = ([p, i]: [number, number], value: unknown, input: unknown): Check => verdict(() => {
    const slot = live[p];
    if (!slot.fns || slot.input !== input) { slot.fns = checks.programs[p](input); slot.input = input; }
    return slot.fns[i](value);
  });
  return {
    enforced: true,
    has: (id) => id !== undefined && has(checks.nodes, String(id)),
    check: (id, value, input) => (has(checks.nodes, String(id)) ? call(checks.nodes[String(id)], value, input) : { ok: true, value }),
    passes: (rule, part, value, input) => {
      const key = part === undefined ? String(rule) : `${rule}.${part}`;
      if (!has(checks.rules, key)) return undefined;
      const r = call(checks.rules[key], value, input);
      return r.ok || r.kind !== 'constraint';
    },
  };
}

// ---------------------------------------------------------------------------
// Dates and durations, without a library
// ---------------------------------------------------------------------------
//
// A form needs very little of them: read what a picker holds, write it as ISO 8601, and say a
// bound in words. The browser's own Date and Intl do all three.

const pad = (n: number, width = 2) => String(Math.trunc(Math.abs(n))).padStart(width, '0');

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?)?\s*(Z|z|[+-]\d{2}(?::?\d{2})?)?$/;

export interface Instant {
  /** Milliseconds since the epoch. */
  ms: number;
  /** The date and time as written, whatever the offset: for showing a time exactly as it was stored. */
  wall: { year: number; month: number; day: number; hour: number; minute: number; second: number };
  dateOnly: boolean;
}

/** Read an ISO 8601 date or datetime. Without an offset it is the reader's own local time, as Elo reads it. */
export function parseTime(text: string): Instant | undefined {
  const m = ISO.exec(text.trim());
  if (!m) return undefined;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [hour, minute, second] = [Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)];
  const milli = m[7] ? Math.round(Number(`0.${m[7]}`) * 1000) : 0;
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  let ms: number;
  if (m[8]) {
    const zone = /^([+-])(\d{2}):?(\d{2})?$/.exec(m[8]);
    const offset = zone ? (zone[1] === '-' ? -1 : 1) * (Number(zone[2]) * 60 + Number(zone[3] ?? 0)) : 0;
    ms = Date.UTC(year, month - 1, day, hour, minute, second, milli) - offset * 60000;
  } else {
    ms = new Date(year, month - 1, day, hour, minute, second, milli).getTime();
  }
  if (Number.isNaN(ms)) return undefined;
  return { ms, wall: { year, month, day, hour, minute, second }, dateOnly: m[4] === undefined };
}

/** `2026-11-17`, in the reader's own time zone. */
export function localDate(ms: number, addDays = 0): string {
  const d = new Date(ms);
  d.setDate(d.getDate() + addDays);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `2026-11-17T09:00`, in the reader's own time zone: what a datetime picker holds. */
export function localWall(ms: number, seconds = false): string {
  const d = new Date(ms);
  return `${localDate(ms)}T${pad(d.getHours())}:${pad(d.getMinutes())}${seconds ? `:${pad(d.getSeconds())}` : ''}`;
}

/** ISO 8601 with the reader's own offset (`+01:00`), or in UTC (`Z`). Milliseconds only when there are some. */
export function isoTime(ms: number, utc: boolean): string {
  const d = new Date(ms);
  const milli = d.getMilliseconds() ? `.${pad(d.getMilliseconds(), 3)}` : '';
  if (utc) return d.toISOString().replace(/\.\d{3}Z$/, `${milli}Z`);
  const offset = -d.getTimezoneOffset();
  return `${localWall(ms, true)}${milli}${offset < 0 ? '-' : '+'}${pad(offset / 60)}:${pad(offset % 60)}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Something a date library made (Luxon's DateTime and Duration both say `toISO()`), as ISO text. */
export function isoOf(v: unknown): string | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : isoTime(v.getTime(), false);
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as { toISO?: unknown }).toISO === 'function') {
    const iso = (v as { toISO(): unknown }).toISO();
    return typeof iso === 'string' ? iso : undefined;
  }
  return undefined;
}

const DURATION = /^P(?:(\d+(?:[.,]\d+)?)Y)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)W)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/;
export const DURATION_UNITS = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/** Read an ISO 8601 duration into amounts per unit. Negative durations are not something a form asks for. */
export function parseDuration(text: string): Partial<Record<DurationUnit, number>> | undefined {
  const m = DURATION.exec(text.trim());
  if (!m || text.trim() === 'P' || /T$/.test(text.trim())) return undefined;
  const parts: Partial<Record<DurationUnit, number>> = {};
  DURATION_UNITS.forEach((unit, i) => {
    if (m[i + 1] !== undefined) parts[unit] = Number(m[i + 1].replace(',', '.'));
  });
  return parts;
}

function sayTime(x: Extract<PlanScalar, { t: 'time' }>, kind: Kind, phrases: Phrases): { value: number; text: string } | undefined {
  if (x.keyword === 'TODAY') return { value: startOfToday(), text: phrases.today };
  if (x.keyword === 'NOW') return { value: Date.now(), text: phrases.now };
  const at = x.v === undefined ? undefined : parseTime(x.v);
  if (!at) return undefined;
  const local = new Date(at.ms);
  const dateOnly = kind === 'date' || (local.getHours() === 0 && local.getMinutes() === 0 && local.getSeconds() === 0 && local.getMilliseconds() === 0);
  // In the language of the sentence it goes into, not the one the browser happens to be set to.
  const format = new Intl.DateTimeFormat(phrases.locale, {
    year: 'numeric', month: 'short', day: 'numeric', ...(dateOnly ? {} : { hour: 'numeric', minute: '2-digit' }),
  });
  return { value: at.ms, text: format.format(local) };
}

function sayDuration(x: Extract<PlanScalar, { t: 'duration' }>, phrases: Phrases): string {
  const said = Object.entries(x.parts).map(([unit, n]) => {
    try {
      return new Intl.NumberFormat(phrases.locale, { style: 'unit', unit: unit.replace(/s$/, ''), unitDisplay: 'long' }).format(n);
    } catch { return `${n} ${unit}`; }
  });
  const List = (Intl as unknown as { ListFormat?: new (l: string, o: object) => { format(x: string[]): string } }).ListFormat;
  return List ? new List(phrases.locale, { type: 'conjunction', style: 'narrow' }).format(said) : said.join(', ');
}

// ---------------------------------------------------------------------------
// Reading constraints, to give hints
// ---------------------------------------------------------------------------
//
// Hints never decide anything: a constraint this code cannot read is still
// enforced, by whoever checks. They only make the form say up front what the
// check would say afterwards.

export interface Bound {
  /** A number as written, a text, or milliseconds for dates, datetimes and durations. */
  value: number | string;
  exclusive: boolean;
  of: 'number' | 'text' | 'time' | 'duration';
}

export interface Facts {
  min?: Bound;
  max?: Bound;
  minLength?: number;
  maxLength?: number;
  /** The only values that can pass, when a constraint lists them. */
  options?: (string | number)[];
}

export interface RuleText {
  rule: PlanRule;
  /** "be greater than 0": reads after "Must". Absent when the rule is verbatim or unreadable. */
  phrase?: string;
  /** The rule's `and`-ed conditions with a phrase each, when every one of them could be read. */
  parts?: { part: number; phrase: string }[];
  /** The author's own sentence: a label with spaces in it. */
  verbatim?: string;
  /** The condition as Elo source, when all else fails and it can be printed. */
  source?: string;
}

export interface Reading { facts: Facts; texts: RuleText[] }

export interface Phrases {
  cmp: Record<'number' | 'date' | 'datetime' | 'duration' | 'text', Record<Cmp, string>>;
  length: Record<'string' | 'array', Record<Cmp, string>>;
  notEmpty: string;
  oneOf: string;
  /** For a constraint known only by its label: `{label}` is e.g. "positive". */
  label: string;
  and: string;
  today: string;
  now: string;
  /** The language these phrases are written in, for the dates and durations inside them: `en`, `fr-BE`… */
  locale: string;
}

function tighter(a: Bound | undefined, b: Bound, sign: 1 | -1): Bound {
  if (!a || a.of !== b.of) return a ?? b;
  if (a.value === b.value) return a.exclusive ? a : b;
  return (a.value > b.value ? sign === 1 : sign === -1) ? a : b;
}

function meet<T>(a: T[] | undefined, b: T[]): T[] {
  const unique = [...new Set(b)];
  return a ? a.filter((v) => unique.includes(v)) : unique;
}

/**
 * What the constraints on a node say, in facts a widget can use and words a person can read.
 *
 * `quantity` dresses a bound on the value itself for display — "100" as "100 %" — when the
 * field has a unit.
 */
export function readRules(node: PlanNode, phrases: Phrases, quantity?: (number: string) => string): Reading {
  const facts: Facts = {};
  const family: keyof Phrases['cmp'] =
    node.kind === 'date' ? 'date' : node.kind === 'datetime' ? 'datetime'
      : node.kind === 'duration' ? 'duration' : node.kind === 'string' ? 'text' : 'number';

  /** One condition -> a phrase, recording what it implies. Undefined when unreadable here. */
  const say = (atom: Atom | null): string | undefined => {
    if (!atom) return undefined;
    switch (atom.a) {
      case 'cmp': {
        const { op, x } = atom;
        let bound: Pick<Bound, 'value' | 'of'>;
        let text: string;
        if (x.t === 'number') { bound = { value: x.v, of: 'number' }; text = quantity ? quantity(String(x.v)) : String(x.v); }
        else if (x.t === 'text') { bound = { value: x.v, of: 'text' }; text = `“${x.v}”`; }
        else if (x.t === 'duration') { bound = { value: x.ms, of: 'duration' }; text = sayDuration(x, phrases); }
        else {
          const said = sayTime(x, node.kind, phrases);
          if (!said) return undefined;
          bound = { value: said.value, of: 'time' };
          text = said.text;
        }
        const fam = x.t === 'text' ? 'text' : family;
        if (fam === 'text' && op !== '==' && op !== '!=') return undefined;
        if (op === '>' || op === '>=') facts.min = tighter(facts.min, { ...bound, exclusive: op === '>' }, 1);
        if (op === '<' || op === '<=') facts.max = tighter(facts.max, { ...bound, exclusive: op === '<' }, -1);
        if (op === '==' && (x.t === 'text' || x.t === 'number')) facts.options = meet(facts.options, [x.v]);
        return fill(phrases.cmp[fam][op], { x: text });
      }
      case 'length': {
        if (node.kind !== 'string' && node.kind !== 'array') return undefined;
        const { op, n } = atom;
        if (op === '>') facts.minLength = Math.max(facts.minLength ?? 0, Math.floor(n) + 1);
        if (op === '>=') facts.minLength = Math.max(facts.minLength ?? 0, Math.ceil(n));
        if (op === '<') facts.maxLength = Math.min(facts.maxLength ?? Infinity, Math.ceil(n) - 1);
        if (op === '<=') facts.maxLength = Math.min(facts.maxLength ?? Infinity, Math.floor(n));
        if (op === '==') { facts.minLength = n; facts.maxLength = n; }
        if (node.kind === 'string' && n === 0 && (op === '>' || op === '!=')) return phrases.notEmpty;
        return fill(phrases.length[node.kind][op], { n, s: n === 1 ? '' : 's' });
      }
      case 'filled':
        facts.minLength = Math.max(facts.minLength ?? 0, 1);
        return phrases.notEmpty;
      case 'oneOf':
        facts.options = meet(facts.options, atom.values);
        return fill(phrases.oneOf, { list: atom.values.map(String).join(', ') });
    }
  };

  const texts = node.rules.map((rule): RuleText => {
    // Read every condition even when the label speaks for the rule: the facts still help the widget.
    const parts = rule.atoms.map(say);
    if (rule.label && /\s/.test(rule.label)) return { rule, verbatim: rule.label };
    if (parts.length && parts.every((p) => p !== undefined)) {
      return {
        rule,
        phrase: joinPhrases(parts as string[], phrases.and),
        parts: parts.map((phrase, part) => ({ part, phrase: phrase as string })),
      };
    }
    if (rule.label) return { rule, phrase: fill(phrases.label, { label: words(rule.label) }) };
    return { rule, source: rule.source };
  });

  return { facts, texts };
}
