/**
 * The widgets: one class per way of asking for a value.
 *
 * Every widget answers the same few questions — is it empty, what was
 * entered, what is wrong with it locally — and the form (form.ts) does the
 * rest. A widget never decides whether its value is valid against the schema:
 * it only reports what cannot even be read ("that is not a number").
 */
import { DateTime, Duration } from 'luxon';
import { check, fill, joinPhrases, passes, readRules, simplify } from './schema.js';
import type { Check, Kind, Model, Reading, RuleText } from './schema.js';
import type { Messages } from './messages.js';

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

export interface FallbackInfo {
  /** Where in the schema: `.lines.*.product`, with `*` for list items and free-named fields. */
  path: string;
  kind: Kind;
  alias?: string;
  depth: number;
}

export interface WidgetOptions {
  /** How datetimes are written: with the browser's UTC offset (default), in UTC, or as bare wall-clock time. */
  datetimeOffset: 'local' | 'utc' | 'none';
  /** Ask for a JSON file instead of building widgets, for the nodes this returns true on. */
  fallback?: (info: FallbackInfo) => boolean;
  /** Nesting depth beyond which a JSON file is asked for. */
  maxDepth: number;
  /** Pick input types (email, url, multi-line…) from field names. */
  guessFromNames: boolean;
  /** Field labels: by schema path (".lines.*.qty"), by key ("qty"), or computed. */
  labels?: Record<string, string> | ((path: string, key: string) => string | undefined);
  /**
   * Units shown beside number and text boxes: by schema path (".lines.*.unitPrice"), by key
   * ("unitPrice"), by type name ("Percent"), or computed. Display only: the data is unchanged.
   */
  units?: Record<string, UnitSpec | null> | ((path: string, key: string | undefined, types: string[]) => UnitSpec | null | undefined);
}

/** A unit: just its text ("cm"), or the text with where it goes and how to read it aloud. */
export type UnitSpec = string | { text: string; position?: 'before' | 'after'; label?: string };

export interface Unit { text: string; position: 'before' | 'after'; label?: string }

export interface Context {
  opts: WidgetOptions;
  msgs: Messages;
  uid: string;
  seq: number;
  /** How many more widgets may be built before composite nodes fall back to a JSON file. */
  budget: number;
  byId: Map<string, Widget>;
  /** A widget changed by something other than typing: a button, a file, a toggle. */
  notify(w: Widget): void;
}

export interface Slot {
  label: string;
  /** `key :? Type` — leaving it empty leaves the key out. */
  optional: boolean;
  /** No visible label: the surroundings already say what this is. */
  bare?: boolean;
  /** No hint either: the surroundings say it once for all. */
  quiet?: boolean;
  /** Where the label's words came from, e.g. "attribute placedOn" or "options.labels.qty". */
  from?: string;
  /** The unit that applies here, once looked up. */
  unit?: Unit;
  depth: number;
  /** The attribute name this sits under, if any. */
  key?: string;
  parent?: Widget;
  seg?: string | number | (() => string | number);
  /** The position in the schema rather than in the data: list items and free-named fields are `*`. */
  schemaPath?: string;
}

type Kid = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, unknown> = {}, ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid || kid === '') el.append(kid);
  return el;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** `firstName`, `first_name`, `first-name` -> "First name". */
export function humanize(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])(?=[A-Z][a-z])/g, '$1 ')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return name;
  // Keep acronyms (URL, ID) as written; lower-case ordinary words after the first.
  return spaced.split(/\s+/).map((w, i) => (/^[A-Z0-9]{2,}$/.test(w) ? w : i === 0 ? cap(w.toLowerCase()) : w.toLowerCase())).join(' ');
}

function singular(noun: string): string {
  if (/ies$/i.test(noun)) return noun.replace(/ies$/i, 'y');
  if (/(ss|us|is)$/i.test(noun)) return noun;
  if (/(ch|sh|x|z|ss)es$/i.test(noun)) return noun.replace(/es$/i, '');
  return noun.replace(/s$/i, '');
}

function joinPath(parent: string, seg: string | number): string {
  return parent === '.' ? `.${seg}` : `${parent}.${seg}`;
}

/** Store a key as data whatever it is called (`__proto__` included), as Elo's own runtime does. */
function put(o: Record<string, unknown>, k: string, v: unknown): void {
  Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true });
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Look a name up in an options record, without finding `constructor` and friends. */
function own<T>(record: Record<string, T>, name: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, name) ? record[name] : undefined;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

/** Currency signs that are written before the amount: $, £, ¥…, also as US$ or CA$. */
const LEADING = /^[A-Z]{0,3}[$£¥₹₩₪₱]$/;

/**
 * The unit for a position, if any: looked up by schema path, then attribute name, then type
 * names (outermost first). Whatever sits directly inside a list, a dictionary or a choice takes
 * the unit of that container unless it has its own; `null` or `''` says "none here".
 */
export function unitFor(ctx: Context, model: Model, slot: Pick<Slot, 'schemaPath' | 'seg' | 'parent'>): Unit | undefined {
  const { units } = ctx.opts;
  const path = slot.schemaPath ?? '.';
  const key = typeof slot.seg === 'string' ? slot.seg : undefined;
  const types = model.aliases ?? [];
  let spec: UnitSpec | null | undefined;
  if (typeof units === 'function') {
    spec = units(path, key, types);
  } else if (units) {
    spec = own(units, path);
    if (spec === undefined && key !== undefined) spec = own(units, key);
    for (let i = 0; spec === undefined && i < types.length; i++) spec = own(units, types[i]);
  }
  if (spec === undefined) return key !== undefined || !slot.parent ? undefined : slot.parent.slot.unit;
  if (spec === null || spec === '') return undefined;
  const text = typeof spec === 'string' ? spec : spec.text;
  if (!text) return undefined;
  const given = typeof spec === 'string' ? undefined : spec;
  const position = given?.position === 'before' || given?.position === 'after' ? given.position : LEADING.test(text) ? 'before' : 'after';
  return { text, position, label: given?.label };
}

/** A number with its unit, as written in a sentence: "20 cm", "100%", "$20", "EUR 20". */
export function quantity(number: string, unit: Unit): string {
  const nbsp = '\u00a0';
  if (unit.position === 'before') return unit.text + (/\p{L}$/u.test(unit.text) ? nbsp : '') + number;
  return number + (/^[%‰°′″]/.test(unit.text) ? '' : nbsp) + unit.text;
}

/**
 * A short name for what a model asks for, used to label alternatives and list items — and where
 * that name was taken from.
 */
export function nameOf(model: Model, msgs: Messages): { text: string; from: string } {
  const m = simplify(model);
  if (m.label) return { text: m.label, from: `messages.kinds.${m.kind}` };
  if (m.alias) return { text: humanize(m.alias), from: `type ${m.alias}` };
  if (m.kind === 'array') {
    const inner = nameOf(m.element!, msgs);
    return { text: fill(msgs.listOf, { what: inner.text }), from: `messages.listOf, ${inner.from}` };
  }
  if (m.kind === 'tuple' && m.props!.length) {
    const keys = m.props!.slice(0, 3).map((p) => humanize(p.key));
    return {
      text: keys.map((k, i) => (i ? k.toLowerCase() : k)).join(', ') + (m.props!.length > 3 ? '…' : ''),
      from: `attributes ${m.props!.slice(0, 3).map((p) => p.key).join(', ')}`,
    };
  }
  if (m.kind === 'union') {
    const parts = m.alts!.map((a) => nameOf(a, msgs));
    return { text: parts.map((p) => p.text).join(msgs.or), from: [...new Set(parts.map((p) => p.from))].join(', ') };
  }
  return { text: msgs.kinds[m.kind], from: `messages.kinds.${m.kind}` };
}

export function describe(model: Model, msgs: Messages): string {
  return nameOf(model, msgs).text;
}

/** Does a value have the rough shape a model asks for? Used to pick an alternative when loading data. */
function fits(model: Model, v: unknown): boolean {
  const m = simplify(model);
  switch (m.kind) {
    case 'string': return typeof v === 'string' || (!!m.textual && typeof v === 'number');
    case 'int': case 'float': return typeof v === 'number';
    case 'bool': return typeof v === 'boolean';
    case 'null': return v === null || v === undefined;
    case 'date': case 'datetime': case 'duration': return typeof v === 'string';
    case 'array': return Array.isArray(v);
    case 'tuple': return isObject(v);
    default: return true;
  }
}

/** One constraint as a sentence, or undefined when nothing readable can be said. */
function sentenceOf(t: RuleText, m: Messages): string | undefined {
  if (t.verbatim) return /[.!?]$/.test(t.verbatim) ? cap(t.verbatim) : cap(t.verbatim) + '.';
  if (t.phrase) return fill(m.must, { phrase: t.phrase });
  if (t.source) return fill(m.mustSatisfy, { source: t.source });
  return undefined;
}

/** The constraints on a node, said up front. */
function hintOf(reading: Reading, m: Messages): string {
  const said = reading.texts.map((t) => sentenceOf(t, m)).filter((s): s is string => !!s);
  return [...new Set(said)].join(' ');
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export abstract class Widget {
  readonly id: string;
  el!: HTMLElement;
  /** Set once the person has been in this widget: only then are its problems shown. */
  touched = false;
  protected reading: Reading;
  protected labelText?: HTMLElement;
  protected ariaTarget?: HTMLElement;
  protected errorEl!: HTMLElement;
  protected noteEl?: HTMLElement;
  protected hintEl?: HTMLElement;
  protected unitEl?: HTMLElement;
  protected control?: HTMLElement;

  constructor(readonly ctx: Context, readonly model: Model, readonly slot: Slot) {
    this.id = `${ctx.uid}-${++ctx.seq}`;
    ctx.byId.set(this.id, this);
    ctx.budget--;
    const unit = slot.unit;
    this.reading = readRules(model, ctx.msgs.phrases, unit && ((n) => quantity(n, unit)));
  }

  get parent(): Widget | undefined { return this.slot.parent; }

  /** Where this value sits in the data, in Elo's notation: `.lines.0.qty`. */
  get path(): string {
    const up = this.parent ? this.parent.path : '.';
    const seg = typeof this.slot.seg === 'function' ? this.slot.seg() : this.slot.seg;
    return seg === undefined || !this.parent ? up : joinPath(up, seg);
  }

  /** May this be left empty? Then empty means "leave out" (optional) or null (nullable). */
  get blankable(): boolean { return this.slot.optional || !!this.model.nullable; }

  abstract isBlank(): boolean;
  /** What was entered, as JSON-safe data. Only meaningful when not blank, except where blank is a value ("" or []). */
  abstract raw(): unknown;
  /** Load a value; `undefined` clears. */
  abstract set(v: unknown): void;

  children(): Widget[] { return []; }
  /** A problem with what was typed that makes it unreadable, before any schema is involved. */
  localError(): string | null { return null; }
  /** True when blank cannot stand for a value, so a required field must be filled in. */
  requiresInput(): boolean { return false; }
  /** True when the schema says more about this node than its widget already guarantees. */
  needsCheck(): boolean { return this.model.rules.length > 0; }
  /** Called once the node is known to be valid. */
  afterCheck(_input: unknown): void { /* nothing by default */ }
  missingMessage(): string { return this.ctx.msgs.required; }

  /** What this contributes to its parent: `undefined` means "leave me out". */
  value(): unknown {
    if (this.isBlank()) {
      if (this.slot.optional) return undefined;
      if (this.model.nullable) return null;
    }
    return this.raw();
  }

  focus(): void {
    const target = this.control ?? this.el.querySelector<HTMLElement>('input, select, textarea, button');
    target?.focus();
  }

  setLabel(text: string): void {
    this.slot.label = text;
    if (this.labelText) this.labelText.textContent = text;
    this.ariaTarget?.setAttribute('aria-label', text);
  }

  showError(message: string | null): void {
    this.errorEl.textContent = message ?? '';
    this.errorEl.hidden = !message;
    // The problem replaces the hint rather than repeating under it.
    if (this.hintEl) this.hintEl.hidden = !!message;
    this.el.classList.toggle('elo-invalid', !!message);
    if (this.control) {
      if (message) this.control.setAttribute('aria-invalid', 'true');
      else this.control.removeAttribute('aria-invalid');
    }
  }

  showNote(message: string | null): void {
    if (!this.noteEl) return;
    this.noteEl.textContent = message ?? '';
    this.noteEl.hidden = !message;
  }

  dispose(): void {
    for (const c of this.children()) c.dispose();
    this.ctx.byId.delete(this.id);
  }


  /** Turn a refusal from Elo into words for the person filling the form in. */
  explain(r: Extract<Check, { ok: false }>, value?: unknown, input?: unknown): string {
    const m = this.ctx.msgs;
    if (r.path === '.' && r.kind === 'constraint') {
      // Elo names the failed constraint by its label only; among those it could be, keep the ones this value fails.
      const pool = this.reading.texts
        .filter((t) => (r.label !== undefined ? t.rule.label === r.label : !t.rule.label))
        .filter((t, _i, all) => all.length === 1 || !passes(t.rule, t.rule.condition, value, input));
      const said = pool.map((t) => {
        const failed = t.parts?.filter((p) => !passes(t.rule, p.condition, value, input));
        if (failed?.length) return fill(m.must, { phrase: joinPhrases(failed.map((p) => p.phrase), m.phrases.and) });
        return sentenceOf(t, m);
      });
      if (pool.length && said.every((s) => s)) return [...new Set(said)].join(' ');
      return m.rejected;
    }
    const text = cap(r.message) + (/[.!?]$/.test(r.message) ? '' : '.');
    return r.path === '.' ? text : `${fill(m.at, { path: r.path.slice(1) })} ${text}`;
  }

  // -- frames ---------------------------------------------------------------

  private tail(extraHint?: string): Kid[] {
    const hint = this.slot.quiet ? '' : [hintOf(this.reading, this.ctx.msgs), extraHint].filter(Boolean).join(' ');
    this.errorEl = h('p', { class: 'elo-error', id: `${this.id}-e`, hidden: true, 'aria-live': 'polite' });
    this.noteEl = h('p', { class: 'elo-note', id: `${this.id}-n`, hidden: true, 'aria-live': 'polite' });
    if (hint) this.hintEl = h('p', { class: 'elo-hint', id: `${this.id}-h` }, hint);
    return [this.hintEl, this.noteEl, this.errorEl];
  }

  private labelKids(): Kid[] {
    this.labelText = h('span', { class: 'elo-label-text', 'data-elo-from': this.slot.from }, this.slot.label);
    return [this.labelText, this.blankable && h('span', { class: 'elo-optional' }, this.ctx.msgs.optional)];
  }

  /** The control with its unit attached, if it has one: `[ 12 ][cm]` or `[$][ 12 ]`. */
  protected affixed(control: HTMLElement, narrow = false): HTMLElement {
    const unit = this.slot.unit;
    if (!unit) return control;
    this.unitEl = h('span', {
      class: 'elo-affix', id: `${this.id}-u`, 'aria-label': unit.label, title: unit.label, onclick: () => control.focus(),
    }, unit.text);
    return h('div', { class: `elo-affixed elo-affixed-${unit.position}${narrow ? ' elo-affixed-narrow' : ''}` },
      ...(unit.position === 'before' ? [this.unitEl, control] : [control, this.unitEl]));
  }

  /** A label, one control, then hint and error. */
  protected field(body: HTMLElement, control: HTMLElement, extraHint?: string): HTMLElement {
    this.control = control;
    control.id = this.id;
    const tail = this.tail(extraHint);
    control.setAttribute('aria-describedby', `${this.unitEl ? `${this.id}-u ` : ''}${this.id}-h ${this.id}-n ${this.id}-e`);
    let label: Kid = null;
    if (this.slot.bare) {
      this.ariaTarget = control;
      control.setAttribute('aria-label', this.slot.label);
    } else {
      label = h('label', { class: 'elo-label', for: this.id }, ...this.labelKids());
    }
    return h('div', { class: `elo-field elo-kind-${this.model.kind}`, 'data-elo-id': this.id, 'data-elo-path': this.slot.schemaPath }, label, body, ...tail);
  }

  /** A titled box around several controls. `lead` goes before the title (a presence toggle). */
  protected group(body: HTMLElement, lead?: HTMLElement, extraHint?: string): HTMLElement {
    const tail = this.tail(extraHint);
    const cls = `elo-group elo-kind-${this.model.kind}`;
    if (this.slot.bare && !lead) {
      const el = h('div', { class: `${cls} elo-bare`, role: 'group', 'aria-label': this.slot.label, 'data-elo-id': this.id, 'data-elo-path': this.slot.schemaPath }, tail[0], body, tail[1], tail[2]);
      this.ariaTarget = el;
      return el;
    }
    const title = lead
      ? h('label', { class: 'elo-check' }, lead, ...this.labelKids())
      : h('span', {}, ...this.labelKids());
    return h('fieldset', { class: cls, 'data-elo-id': this.id, 'data-elo-path': this.slot.schemaPath },
      h('legend', { class: 'elo-label' }, title), tail[0], body, tail[1], tail[2]);
  }
}

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

function guessFromName(key = ''): { type?: string; multiline?: boolean; autocomplete?: string } {
  const k = key.toLowerCase();
  if (/e-?mail/.test(k)) return { type: 'email', autocomplete: 'email' };
  if (/(url|website|homepage|link)$/.test(k)) return { type: 'url', autocomplete: 'url' };
  if (/phone|mobile|^tel$/.test(k)) return { type: 'tel', autocomplete: 'tel' };
  if (/password|passwd|secret/.test(k)) return { type: 'password', autocomplete: 'off' };
  if (/(description|notes?|comments?|message|body|bio|summary|content|remarks?)$/.test(k)) return { multiline: true };
  return {};
}

function selectOf(options: (string | number)[], msgs: Messages): HTMLSelectElement {
  return h('select', { class: 'elo-input' },
    h('option', { value: '' }, msgs.choose),
    ...options.map((o) => h('option', { value: String(o) }, String(o))));
}

function setSelect(select: HTMLSelectElement, value: string): void {
  if (value !== '' && ![...select.options].some((o) => o.value === value)) {
    // A value the schema does not list: keep it visible so validation can say so, rather than dropping it.
    select.append(h('option', { value }, value));
  }
  select.value = value;
}

/** What to show for loaded data in a one-line box; data of the wrong shape shows as nothing. */
function scalarText(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}

class TextWidget extends Widget {
  private input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const { options, maxLength } = this.reading.facts;
    const guess = ctx.opts.guessFromNames ? guessFromName(slot.key) : {};
    if (options && !model.textual) {
      this.input = selectOf(options, ctx.msgs);
    } else if (guess.multiline || (maxLength !== undefined && maxLength > 120)) {
      this.input = h('textarea', { class: 'elo-input', rows: 3, maxlength: Number.isFinite(maxLength) ? maxLength : undefined });
    } else {
      this.input = h('input', {
        class: 'elo-input', type: guess.type ?? 'text', autocomplete: guess.autocomplete,
        maxlength: Number.isFinite(maxLength) ? maxLength : undefined,
      });
    }
    const body = this.input.tagName === 'TEXTAREA' ? this.input : this.affixed(this.input);
    this.el = this.field(body, this.input, model.textual ? ctx.msgs.textOrNumber : undefined);
  }

  isBlank() { return this.input.value === ''; }
  /** A drop-down left on "Choose…" holds none of the values it lists: that needs no evaluating to know. */
  requiresInput() { return this.input instanceof HTMLSelectElement && !this.reading.facts.options?.includes(''); }
  raw() { return this.input.value; }
  set(v: unknown) {
    const text = scalarText(v);
    if (this.input instanceof HTMLSelectElement) setSelect(this.input, text);
    else this.input.value = text;
  }
}

const INT = /^[+-]?\d+$/;
// The spelling Elo's own Float accepts.
const FLOAT = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

class NumberWidget extends Widget {
  private input: HTMLInputElement | HTMLSelectElement;
  private int: boolean;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    this.int = model.kind === 'int';
    const { options, min } = this.reading.facts;
    const numeric = options?.filter((o): o is number => typeof o === 'number');
    if (numeric && numeric.length === options!.length) {
      this.input = selectOf(numeric, ctx.msgs);
    } else {
      // The numeric keypads have no minus key on some phones: only use them when no negative can be valid.
      const positive = typeof min?.value === 'number' && min.value >= 0;
      this.input = h('input', {
        class: 'elo-input elo-input-number', type: 'text', autocomplete: 'off',
        inputmode: positive ? (this.int ? 'numeric' : 'decimal') : 'text',
      });
    }
    this.el = this.field(this.affixed(this.input, true), this.input);
  }

  private text() { return this.input.value.trim(); }
  isBlank() { return this.text() === ''; }
  requiresInput() { return true; }
  localError() {
    const t = this.text();
    if (t === '' || (this.int ? INT : FLOAT).test(t)) return null;
    return this.int ? this.ctx.msgs.notInt : this.ctx.msgs.notFloat;
  }
  raw() {
    const t = this.text();
    if (t === '') return undefined;
    const n = Number(t);
    // Past what a JSON number carries exactly, hand Elo the digits: it reads numeric strings.
    if (this.int ? !Number.isSafeInteger(n) : !Number.isFinite(n)) return t;
    return n;
  }
  set(v: unknown) {
    const text = scalarText(v);
    if (this.input instanceof HTMLSelectElement) setSelect(this.input, text);
    else this.input.value = text;
  }
}

class BoolWidget extends Widget {
  private box?: HTMLInputElement;
  private select?: HTMLSelectElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    if (this.blankable) {
      // Three answers: yes, no, and no answer.
      this.select = h('select', { class: 'elo-input' },
        h('option', { value: '' }, ctx.msgs.unspecified),
        h('option', { value: 'true' }, ctx.msgs.yes),
        h('option', { value: 'false' }, ctx.msgs.no));
      this.el = this.field(this.select, this.select);
    } else {
      this.box = h('input', { type: 'checkbox', class: 'elo-checkbox' });
      // A checkbox is labelled by the text beside it, so it keeps a visible label even where others go bare.
      this.slot.bare = false;
      const wrapper = h('span', { class: 'elo-check-control' }, this.box);
      this.el = this.field(wrapper, this.box);
      this.el.classList.add('elo-inline');
    }
  }

  isBlank() { return this.select ? this.select.value === '' : false; }
  raw() { return this.select ? this.select.value === 'true' : this.box!.checked; }
  set(v: unknown) {
    const known = v === true || v === 'true' ? 'true' : v === false || v === 'false' ? 'false' : '';
    if (this.select) this.select.value = known;
    else this.box!.checked = known === 'true';
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateBound(b: { value: unknown; exclusive: boolean } | undefined, step: number): DateTime | undefined {
  if (!b || !DateTime.isDateTime(b.value)) return undefined;
  return b.exclusive ? b.value.plus({ days: step }) : b.value;
}

class DateWidget extends Widget {
  private input: HTMLInputElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const { min, max } = this.reading.facts;
    this.input = h('input', {
      class: 'elo-input elo-input-date', type: 'date',
      min: dateBound(min, 1)?.toISODate(), max: dateBound(max, -1)?.toISODate(),
    });
    this.el = this.field(this.input, this.input);
  }

  private half() { return !!this.input.validity?.badInput; }
  isBlank() { return this.input.value === '' && !this.half(); }
  requiresInput() { return true; }
  localError() {
    return this.half() || (this.input.value !== '' && !DATE.test(this.input.value)) ? this.ctx.msgs.notDate : null;
  }
  raw() { return this.input.value || undefined; }
  set(v: unknown) {
    if (DateTime.isDateTime(v)) this.input.value = v.toISODate() ?? '';
    else if (v instanceof Date) this.input.value = DateTime.fromJSDate(v).toISODate() ?? '';
    else this.input.value = typeof v === 'string' ? v.slice(0, 10) : '';
  }
}

class DatetimeWidget extends Widget {
  private input: HTMLInputElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const { min, max } = this.reading.facts;
    const wall = (b: typeof min) => (b && DateTime.isDateTime(b.value) ? b.value.toLocal().toFormat("yyyy-MM-dd'T'HH:mm") : undefined);
    this.input = h('input', { class: 'elo-input elo-input-datetime', type: 'datetime-local', min: wall(min), max: wall(max) });
    this.el = this.field(this.input, this.input);
  }

  private half() { return !!this.input.validity?.badInput; }
  private parsed() { return DateTime.fromISO(this.input.value); }
  isBlank() { return this.input.value === '' && !this.half(); }
  requiresInput() { return true; }
  localError() {
    return this.half() || (this.input.value !== '' && !this.parsed().isValid) ? this.ctx.msgs.notDatetime : null;
  }
  raw() {
    if (this.input.value === '') return undefined;
    const d = this.parsed();
    if (!d.isValid) return this.input.value;
    const mode = this.ctx.opts.datetimeOffset;
    if (mode === 'none') return d.toFormat("yyyy-MM-dd'T'HH:mm:ss");
    return (mode === 'utc' ? d.toUTC() : d).toISO({ suppressMilliseconds: true });
  }
  set(v: unknown) {
    let d: DateTime | undefined;
    if (DateTime.isDateTime(v)) d = v;
    else if (v instanceof Date) d = DateTime.fromJSDate(v);
    else if (typeof v === 'string') d = DateTime.fromISO(v, { setZone: this.ctx.opts.datetimeOffset === 'none' });
    if (!d || !d.isValid) { this.input.value = ''; return; }
    // The picker shows wall-clock time: the viewer's own, unless offsets are not in play at all.
    if (this.ctx.opts.datetimeOffset !== 'none') d = d.toLocal();
    const seconds = d.second !== 0;
    if (seconds) this.input.step = '1';
    this.input.value = d.toFormat(seconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm");
  }
}

const UNITS = [
  ['years', 'Y', false], ['months', 'M', false], ['weeks', 'W', false], ['days', 'D', true],
  ['hours', 'H', true], ['minutes', 'M', true], ['seconds', 'S', false],
] as const;
type DurationUnit = (typeof UNITS)[number][0];

class DurationWidget extends Widget {
  private inputs = new Map<DurationUnit, HTMLInputElement>();
  private cells = new Map<DurationUnit, HTMLElement>();
  private more: HTMLButtonElement;
  private expanded = false;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const row = h('div', { class: 'elo-duration-parts' });
    for (const [unit] of UNITS) {
      const input = h('input', { class: 'elo-input elo-duration-input', type: 'text', inputmode: unit === 'seconds' ? 'decimal' : 'numeric', autocomplete: 'off', size: 3 });
      const cell = h('label', { class: 'elo-duration-part' }, input, h('span', {}, ctx.msgs.units[unit]));
      this.inputs.set(unit, input);
      this.cells.set(unit, cell);
      row.append(cell);
    }
    this.more = h('button', { type: 'button', class: 'elo-link', onclick: () => this.expand(!this.expanded) });
    row.append(this.more);
    this.el = this.group(row);
    this.control = this.inputs.get('days')!;
    this.expand(false);
  }

  private expand(on: boolean) {
    this.expanded = on;
    for (const [unit, , main] of UNITS) {
      // Never hide a unit that holds something.
      this.cells.get(unit)!.hidden = !on && !main && this.inputs.get(unit)!.value.trim() === '';
    }
    this.more.textContent = on ? this.ctx.msgs.fewerUnits : this.ctx.msgs.moreUnits;
    this.more.setAttribute('aria-expanded', String(on));
  }

  private text(unit: DurationUnit) { return this.inputs.get(unit)!.value.trim(); }
  isBlank() { return UNITS.every(([u]) => this.text(u) === ''); }
  requiresInput() { return true; }
  localError() {
    const bad = UNITS.some(([u]) => this.text(u) !== '' && !(u === 'seconds' ? /^\d+(\.\d+)?$/ : /^\d+$/).test(this.text(u)));
    return bad ? this.ctx.msgs.notDuration : null;
  }
  raw() {
    if (this.isBlank()) return undefined;
    // ISO 8601, with whole numbers per unit: the one spelling every Elo target reads.
    let date = '', time = '';
    for (const [unit, letter] of UNITS) {
      const t = this.text(unit).replace(/^0+(?=\d)/, '');
      if (t === '' || Number(t) === 0) continue;
      if (unit === 'hours' || unit === 'minutes' || unit === 'seconds') time += t + letter;
      else date += t + letter;
    }
    if (!date && !time) return 'PT0S';
    return 'P' + date + (time ? 'T' + time : '');
  }
  set(v: unknown) {
    for (const input of this.inputs.values()) input.value = '';
    const d = Duration.isDuration(v) ? v : typeof v === 'string' ? Duration.fromISO(v) : undefined;
    if (d && d.isValid) {
      const o = d.toObject() as Record<string, number | undefined>;
      const seconds = (o.seconds ?? 0) + (o.milliseconds ?? 0) / 1000;
      const months = (o.months ?? 0) + (o.quarters ?? 0) * 3;
      const parts: Record<DurationUnit, number> = {
        years: o.years ?? 0, months, weeks: o.weeks ?? 0, days: o.days ?? 0,
        hours: o.hours ?? 0, minutes: o.minutes ?? 0, seconds,
      };
      let any = false;
      for (const [unit] of UNITS) if (parts[unit]) { this.inputs.get(unit)!.value = String(parts[unit]); any = true; }
      if (!any) this.inputs.get('days')!.value = '0';
    }
    this.expand(this.expanded);
  }
}

class NullWidget extends Widget {
  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const text = h('p', { class: 'elo-static', tabindex: -1 }, ctx.msgs.alwaysEmpty);
    this.el = this.field(text, text);
  }
  isBlank() { return false; }
  raw() { return null; }
  set() { /* there is only one value */ }
}

// ---------------------------------------------------------------------------
// The fallback: ask for a JSON file
// ---------------------------------------------------------------------------

function summarize(v: unknown, msgs: Messages): string {
  const s = msgs.jsonSummary;
  const count = (t: string, n: number) => fill(t, { n, s: n === 1 ? '' : 's' });
  if (Array.isArray(v)) return count(s.list, v.length);
  if (isObject(v)) return count(s.fields, Object.keys(v).length);
  if (typeof v === 'string') return s.text;
  if (typeof v === 'number') return s.number;
  if (typeof v === 'boolean') return s.bool;
  return s.empty;
}

function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export class JsonWidget extends Widget {
  private has = false;
  private val: unknown;
  private err: string | null = null;
  private file: HTMLInputElement;
  private status: HTMLElement;
  private clear: HTMLButtonElement;
  private paste: HTMLTextAreaElement;
  private drop: HTMLElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const m = ctx.msgs;
    this.file = h('input', { type: 'file', accept: '.json,application/json', class: 'elo-file', onchange: () => this.pick(this.file.files?.[0]) });
    this.drop = h('label', { class: 'elo-drop' }, this.file,
      h('span', { class: 'elo-drop-main' }, m.jsonChoose), ' ', h('span', { class: 'elo-drop-more' }, m.jsonDrop));
    this.drop.addEventListener('dragover', (e) => { e.preventDefault(); this.drop.classList.add('elo-over'); });
    this.drop.addEventListener('dragleave', () => this.drop.classList.remove('elo-over'));
    this.drop.addEventListener('drop', (e) => {
      e.preventDefault();
      this.drop.classList.remove('elo-over');
      this.pick(e.dataTransfer?.files?.[0]);
    });
    this.status = h('span', { class: 'elo-json-status' });
    this.clear = h('button', { type: 'button', class: 'elo-link', hidden: true, onclick: () => { this.set(undefined); ctx.notify(this); } },
      fill(m.remove, { item: '' }).trim());
    this.paste = h('textarea', { class: 'elo-input elo-paste', rows: 4, spellcheck: 'false', 'aria-label': m.jsonPaste });
    this.paste.addEventListener('input', (e) => {
      // Handled here, then left to bubble: the form listens for input events too.
      void e;
      const text = this.paste.value.trim();
      if (text === '') this.forget();
      else this.load(text, null);
    });
    const body = h('div', { class: 'elo-json-box' },
      this.drop,
      h('div', { class: 'elo-json-state' }, this.status, this.clear),
      h('details', { class: 'elo-json-paste' }, h('summary', {}, m.jsonPaste), this.paste));
    this.el = this.field(body, this.file);
  }

  private pick(file: File | undefined) {
    if (!file) return;
    readText(file).then(
      (text) => { this.paste.value = ''; this.load(text, file.name); this.ctx.notify(this); },
      (e) => { this.err = String(e?.message ?? e); this.ctx.notify(this); },
    );
  }

  private load(text: string, name: string | null) {
    const m = this.ctx.msgs;
    try {
      this.val = JSON.parse(text);
      this.has = true;
      this.err = null;
      const summary = summarize(this.val, m);
      this.status.textContent = name ? fill(m.jsonLoaded, { name, summary }) : cap(summary);
    } catch (e: any) {
      this.has = false;
      this.val = undefined;
      this.err = fill(m.jsonBad, { detail: String(e?.message ?? e) });
      this.status.textContent = name ?? '';
    }
    this.clear.hidden = !this.has && !this.err;
  }

  private forget() {
    this.has = false;
    this.val = undefined;
    this.err = null;
    this.status.textContent = '';
    this.clear.hidden = true;
    this.file.value = '';
  }

  isBlank() { return !this.has && !this.err; }
  requiresInput() { return true; }
  missingMessage() { return this.ctx.msgs.jsonRequired; }
  localError() { return this.err; }
  /** When this stands in for a typed node, the whole upload is checked against that type. */
  needsCheck() { return !!this.model.type; }
  raw() { return this.val; }
  set(v: unknown) {
    this.forget();
    this.paste.value = '';
    if (v === undefined) return;
    this.has = true;
    this.val = v;
    this.status.textContent = fill(this.ctx.msgs.jsonCurrent, { summary: summarize(v, this.ctx.msgs) });
    this.clear.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// Tuples
// ---------------------------------------------------------------------------

class TupleWidget extends Widget {
  private fields: Widget[] = [];
  private extras?: ExtrasWidget;
  /** Attributes an open schema (`...`) lets through: kept when editing existing data. */
  private carried: Record<string, unknown> = {};
  private present: boolean;
  private built = false;
  private toggle?: HTMLInputElement;
  private body: HTMLElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    this.present = !this.blankable;
    this.body = h('div', { class: 'elo-fields' });
    if (this.blankable) {
      // Nothing inside can stand for "no value", so presence gets its own switch.
      this.toggle = h('input', { type: 'checkbox', class: 'elo-checkbox', onchange: () => this.setPresent(this.toggle!.checked) });
    }
    this.el = this.group(this.body, this.toggle);
    if (this.toggle) this.control = this.toggle;
    this.body.hidden = !this.present;
    if (this.present) this.build();
  }

  private build() {
    this.built = true;
    const { ctx, model, slot } = this;
    for (const p of model.props!) {
      const named = labelFor(ctx, joinPath(slot.schemaPath ?? '.', p.key), p.key);
      const child = make(ctx, p.model, {
        label: named.label, from: named.from, optional: p.optional,
        depth: slot.depth + 1, key: p.key, parent: this, seg: p.key,
      });
      this.fields.push(child);
      this.body.append(child.el);
    }
    if (typeof model.extras === 'object') {
      this.extras = new ExtrasWidget(ctx, model.extras, model.props!.map((p) => p.key),
        { label: ctx.msgs.otherFields, from: 'messages.otherFields', optional: false, depth: slot.depth + 1, parent: this, schemaPath: slot.schemaPath, unit: slot.unit });
      this.body.append(this.extras.el);
    }
    if (!this.fields.length && !this.extras) this.body.append(h('p', { class: 'elo-static' }, ctx.msgs.noDetails));
    // A few one-box fields sit side by side when they are a row of a list.
    const short = model.props!.every((p) => SINGLE.includes(simplify(p.model).kind) || simplify(p.model).kind === 'bool');
    if (short && !this.extras && this.fields.length <= 4 && typeof slot.seg === 'function') this.el.classList.add('elo-compact');
  }

  private setPresent(on: boolean) {
    this.present = on;
    if (on && !this.built) this.build();
    this.body.hidden = !on;
    if (this.toggle) this.toggle.checked = on;
  }

  isBlank() { return !this.present; }
  children() { return this.present ? [...this.fields, ...(this.extras ? [this.extras] : [])] : []; }
  raw() {
    const o: Record<string, unknown> = {};
    if (this.model.extras === 'ignored') for (const [k, v] of Object.entries(this.carried)) put(o, k, v);
    this.model.props!.forEach((p, i) => {
      const v = this.fields[i].value();
      if (v !== undefined) put(o, p.key, v);
    });
    if (this.extras) for (const [k, v] of Object.entries(this.extras.raw())) put(o, k, v);
    return o;
  }
  set(v: unknown) {
    if (!isObject(v)) {
      this.carried = {};
      if (this.blankable) { this.setPresent(false); if (!this.built) return; }
      for (const f of this.fields) f.set(undefined);
      this.extras?.set(undefined);
      return;
    }
    this.setPresent(true);
    const known = new Set(this.model.props!.map((p) => p.key));
    this.model.props!.forEach((p, i) => this.fields[i].set(Object.prototype.hasOwnProperty.call(v, p.key) ? v[p.key] : undefined));
    const rest: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (!known.has(k)) put(rest, k, x);
    this.carried = rest;
    this.extras?.set(rest);
  }
}

/** `{ …, ...: Type }` — any number of extra attributes, each named by the person filling the form in. */
class ExtrasWidget extends Widget {
  private rows: { key: HTMLInputElement; w: Widget; el: HTMLElement }[] = [];
  private list = h('div', { class: 'elo-rows' });

  constructor(ctx: Context, private valueModel: Model, private taken: string[], slot: Slot) {
    super(ctx, { kind: 'tuple', rules: [] }, slot);
    const add = h('button', { type: 'button', class: 'elo-add', onclick: () => { this.add('', undefined).key.focus(); ctx.notify(this); } },
      '+ ', ctx.msgs.addField);
    this.el = this.group(h('div', { class: 'elo-extras-body' }, this.list, add));
    this.el.classList.add('elo-extras');
    this.control = add;
  }

  private add(name: string, v: unknown) {
    const m = this.ctx.msgs;
    const key = h('input', { class: 'elo-input elo-key', type: 'text', placeholder: m.fieldName, 'aria-label': m.fieldName, autocomplete: 'off' });
    key.value = name;
    const w = make(this.ctx, this.valueModel, {
      label: name || m.field, optional: false, bare: true, depth: this.slot.depth + 1, parent: this, seg: () => key.value,
    });
    key.addEventListener('input', () => w.setLabel(key.value || m.field));
    const remove = h('button', {
      type: 'button', class: 'elo-icon', 'aria-label': fill(m.remove, { item: m.field }), title: fill(m.remove, { item: m.field }),
      onclick: () => { this.rows = this.rows.filter((r) => r !== row); row.el.remove(); w.dispose(); this.ctx.notify(this); },
    }, '×');
    const row = { key, w, el: h('div', { class: 'elo-row' }, key, h('div', { class: 'elo-row-value' }, w.el), remove) };
    this.rows.push(row);
    this.list.append(row.el);
    if (v !== undefined) w.set(v);
    return row;
  }

  isBlank() { return false; }
  children() { return this.rows.map((r) => r.w); }
  localError() {
    const m = this.ctx.msgs;
    const seen = new Set<string>();
    for (const { key } of this.rows) {
      const k = key.value;
      if (k === '') return m.keyMissing;
      if (this.taken.includes(k)) return fill(m.keyTaken, { key: k });
      if (seen.has(k)) return fill(m.keyTwice, { key: k });
      seen.add(k);
    }
    return null;
  }
  raw() {
    const o: Record<string, unknown> = {};
    for (const { key, w } of this.rows) {
      const v = w.value();
      put(o, key.value, v === undefined ? null : v);
    }
    return o;
  }
  set(v: unknown) {
    for (const r of this.rows) { r.el.remove(); r.w.dispose(); }
    this.rows = [];
    if (isObject(v)) for (const [k, x] of Object.entries(v)) this.add(k, x);
  }
}

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

/** Kinds whose widget is a single control, shown without a label of its own inside a list or a choice. */
const SINGLE: Kind[] = ['string', 'int', 'float', 'date', 'datetime', 'null', 'json'];

class ArrayWidget extends Widget {
  private items: { w: Widget; el: HTMLElement; up: HTMLButtonElement; down: HTMLButtonElement; remove: HTMLButtonElement }[] = [];
  private list = h('ol', { class: 'elo-items' });
  private empty: HTMLElement;
  private noun: string;
  private nounFrom: string;
  private quiet: boolean;
  private addButton: HTMLButtonElement;

  constructor(ctx: Context, model: Model, slot: Slot) {
    super(ctx, model, slot);
    const element = simplify(model.element!);
    // "Add line" for `lines`; a list inside a list has no name to borrow.
    const keyed = !!slot.key && !(slot.parent instanceof ArrayWidget);
    this.noun = element.alias ? humanize(element.alias).toLowerCase()
      : keyed ? singular(humanize(slot.key!).toLowerCase()) : ctx.msgs.item;
    this.nounFrom = element.alias ? `type ${element.alias}` : keyed ? `attribute ${slot.key}, singular` : 'messages.item';
    // What every item must satisfy is said once here rather than under each of them.
    this.quiet = SINGLE.includes(element.kind);
    const unit = unitFor(ctx, element, { schemaPath: joinPath(slot.schemaPath ?? '.', '*'), seg: () => 0, parent: this });
    const each = this.quiet ? hintOf(readRules(element, ctx.msgs.phrases, unit && ((n) => quantity(n, unit))), ctx.msgs) : '';
    this.empty = h('p', { class: 'elo-static elo-empty' }, ctx.msgs.noItems);
    this.addButton = h('button', { type: 'button', class: 'elo-add', onclick: () => { this.add(undefined).w.focus(); ctx.notify(this); } },
      '+ ', fill(ctx.msgs.add, { item: this.noun }));
    this.el = this.group(h('div', { class: 'elo-list-body' }, this.empty, this.list, this.addButton), undefined,
      each && fill(ctx.msgs.each, { item: this.noun, hint: each }));
    this.control = this.addButton;
  }

  private title(i: number) { return `${cap(this.noun)} ${i + 1}`; }

  private add(v: unknown) {
    const { ctx } = this;
    const element = simplify(this.model.element!);
    const w = make(ctx, this.model.element!, {
      label: this.title(this.items.length), from: this.nounFrom, optional: false, bare: SINGLE.includes(element.kind), quiet: this.quiet,
      depth: this.slot.depth + 1, key: this.slot.key && singular(this.slot.key), parent: this,
      seg: () => this.items.findIndex((it) => it.w === w),
    });
    const button = (glyph: string, act: () => void) =>
      h('button', { type: 'button', class: 'elo-icon', onclick: () => { act(); this.renumber(); ctx.notify(this); } }, glyph);
    const index = () => this.items.indexOf(item);
    const up = button('↑', () => this.move(index(), -1));
    const down = button('↓', () => this.move(index(), 1));
    const remove = button('×', () => { this.items.splice(index(), 1); item.el.remove(); w.dispose(); });
    const item = {
      w, up, down, remove,
      el: h('li', { class: 'elo-item' }, h('div', { class: 'elo-item-body' }, w.el), h('div', { class: 'elo-item-actions' }, up, down, remove)),
    };
    this.items.push(item);
    this.list.append(item.el);
    if (v !== undefined) w.set(v);
    this.renumber();
    return item;
  }

  private move(i: number, by: number) {
    const j = i + by;
    if (j < 0 || j >= this.items.length) return;
    const [item] = this.items.splice(i, 1);
    this.items.splice(j, 0, item);
    this.list.insertBefore(item.el, this.list.children[j] ?? null);
    item.w.focus();
  }

  private renumber() {
    const m = this.ctx.msgs;
    this.empty.hidden = this.items.length > 0;
    this.items.forEach((it, i) => {
      const title = this.title(i);
      it.w.setLabel(title);
      it.up.disabled = i === 0;
      it.down.disabled = i === this.items.length - 1;
      for (const [b, text] of [[it.up, m.moveUp], [it.down, m.moveDown], [it.remove, m.remove]] as const) {
        const label = fill(text, { item: title.toLowerCase() });
        b.setAttribute('aria-label', label);
        b.title = label;
      }
    });
  }

  isBlank() { return this.items.length === 0; }
  children() { return this.items.map((it) => it.w); }
  raw() {
    return this.items.map((it) => {
      const v = it.w.value();
      return v === undefined ? null : v;
    });
  }
  set(v: unknown) {
    for (const it of this.items) { it.el.remove(); it.w.dispose(); }
    this.items = [];
    if (Array.isArray(v)) for (const x of v) this.add(x === undefined ? null : x);
    this.renumber();
  }
}

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

class UnionWidget extends Widget {
  protected alts: Model[];
  protected labels: string[];
  protected active = -1;
  private start: number;
  private built: (Widget | undefined)[] = [];
  private radios: HTMLInputElement[] = [];
  private noneRadio?: HTMLInputElement;
  private body = h('div', { class: 'elo-choice-body' });

  /**
   * `none` adds a choice that stands for no value at all, under that label; `start` is the choice a
   * fresh form opens on (-1 for none).
   */
  constructor(ctx: Context, model: Model, slot: Slot, alts: Model[] = model.alts!, start?: number, none?: string) {
    super(ctx, model, slot);
    this.alts = alts;
    if (none === undefined && this.blankable) none = ctx.msgs.none;
    this.start = start ?? (none === undefined ? 0 : -1);
    const seen = new Map<string, number>();
    const names = alts.map((a) => nameOf(a, ctx.msgs));
    this.labels = names.map(({ text }) => {
      const n = (seen.get(text) ?? 0) + 1;
      seen.set(text, n);
      return n === 1 ? text : `${text} (${n})`;
    });
    const choices = h('div', { class: 'elo-choices' });
    const radio = (i: number, text: string, from: string) => {
      const input = h('input', { type: 'radio', name: this.id, value: String(i), onchange: () => this.pick(i) });
      choices.append(h('label', { class: 'elo-choice' }, input, h('span', { 'data-elo-from': from }, text)));
      return input;
    };
    if (none !== undefined) this.noneRadio = radio(-1, none, none === ctx.msgs.none ? 'messages.none' : 'messages.kinds.null');
    this.radios = this.labels.map((text, i) => radio(i, text, names[i].from));
    this.el = this.group(h('div', { class: 'elo-union-body' }, choices, this.body));
    this.control = this.noneRadio ?? this.radios[0];
    this.pick(this.start);
  }

  protected widget(i: number): Widget {
    return (this.built[i] ??= make(this.ctx, this.alts[i], {
      label: this.labels[i], optional: false, bare: true, depth: this.slot.depth + 1, key: this.slot.key, parent: this,
    }));
  }

  protected pick(i: number) {
    this.active = i;
    if (this.noneRadio) this.noneRadio.checked = i < 0;
    this.radios.forEach((r, j) => { r.checked = j === i; });
    this.body.replaceChildren(...(i < 0 ? [] : [this.widget(i).el]));
    this.body.hidden = i < 0;
    this.showNote(null);
  }

  isBlank() { return this.active < 0; }
  children() { return this.active < 0 ? [] : [this.widget(this.active)]; }
  raw() { return this.active < 0 ? undefined : this.widget(this.active).value(); }

  set(v: unknown) {
    for (const w of this.built) w?.set(undefined);
    // No data means "none" where there is such a choice — never a value the form made up.
    if (v === undefined || (v === null && this.noneRadio)) { this.pick(this.noneRadio ? -1 : this.start); return; }
    // The alternative Elo itself would take, else the first of the right shape.
    let i = this.alts.findIndex((a) => (a.type ? check(a, v, v).ok : false));
    if (i < 0) i = this.alts.findIndex((a) => fits(a, v));
    if (i < 0) i = this.start;
    this.pick(i);
    this.widget(i).set(v);
  }

  /** Alternatives are tried left to right: say so when an earlier one will win. */
  afterCheck(input: unknown) {
    let note: string | null = null;
    if (this.active > 0) {
      const v = this.value();
      for (let j = 0; j < this.active; j++) {
        if (this.alts[j].type && check(this.alts[j], v, input).ok) {
          note = fill(this.ctx.msgs.readAs, { label: this.labels[j] });
          break;
        }
      }
    }
    this.showNote(note);
  }
}

/**
 * `.` (anything) and `Data`: a simple value typed in, or a JSON file for the rest.
 *
 * This is the one place a schema says nothing about shape, so it is where the
 * JSON file is the natural answer — text, numbers and yes/no are offered
 * first because they are what such a field holds most of the time.
 */
class AnyWidget extends UnionWidget {
  constructor(ctx: Context, model: Model, slot: Slot) {
    const k = ctx.msgs.kinds;
    const alts: Model[] = [
      { kind: 'string', rules: [], label: k.string },
      { kind: 'float', rules: [], label: k.float },
      { kind: 'bool', rules: [], label: k.bool },
      { kind: 'json', rules: [], label: k.json },
    ];
    // "Nothing" is always on offer: anything includes nothing. A fresh form still opens on
    // something to fill in, unless the field may be left out anyway.
    const start = slot.optional || model.nullable ? -1 : model.kind === 'data' ? alts.length - 1 : 0;
    super(ctx, model, slot, alts, start, k.null);
  }

  raw() {
    // Nothing chosen, where leaving out is not an option, is null.
    if (this.active < 0) return null;
    const v = super.raw();
    // Elo's Data parses a string as JSON, so a plain text has to arrive quoted.
    return this.model.kind === 'data' && typeof v === 'string' ? JSON.stringify(v) : v;
  }

  set(v: unknown) {
    if (this.model.kind === 'data' && typeof v === 'string') {
      try { v = JSON.parse(v); } catch { /* not JSON: leave it to validation to say so */ }
    }
    super.set(v);
  }

  afterCheck() { /* the alternatives here are ways of typing, not schema alternatives */ }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** The label of a field, and where it was taken from: the options first, else the attribute's name. */
function labelFor(ctx: Context, path: string, key: string): { label: string; from: string } {
  const { labels } = ctx.opts;
  if (typeof labels === 'function') {
    const label = labels(path, key);
    if (label !== undefined) return { label, from: 'options.labels()' };
  } else if (labels) {
    const byPath = own(labels, path);
    if (byPath !== undefined) return { label: byPath, from: `options.labels["${path}"]` };
    const byKey = own(labels, key);
    if (byKey !== undefined) return { label: byKey, from: `options.labels.${key}` };
  }
  return { label: humanize(key), from: `attribute ${key}` };
}

/** Build the widget for a model. This is the whole mapping from Elo types to widgets. */
export function make(ctx: Context, model: Model, slot: Slot): Widget {
  const m = simplify(model);
  const composite = m.kind === 'tuple' || m.kind === 'array' || m.kind === 'union';
  const up = slot.parent?.slot.schemaPath ?? '.';
  slot.schemaPath = !slot.parent || slot.seg === undefined ? up : joinPath(up, typeof slot.seg === 'function' ? '*' : slot.seg);
  slot.unit = unitFor(ctx, m, slot);
  const forced = ctx.opts.fallback?.({ path: slot.schemaPath, kind: m.kind, alias: m.alias, depth: slot.depth });
  if (forced || (composite && (slot.depth > ctx.opts.maxDepth || ctx.budget <= 0))) {
    return new JsonWidget(ctx, { ...m, kind: 'json' }, slot);
  }
  switch (m.kind) {
    case 'string': return new TextWidget(ctx, m, slot);
    case 'int': case 'float': return new NumberWidget(ctx, m, slot);
    case 'bool': return new BoolWidget(ctx, m, slot);
    case 'date': return new DateWidget(ctx, m, slot);
    case 'datetime': return new DatetimeWidget(ctx, m, slot);
    case 'duration': return new DurationWidget(ctx, m, slot);
    case 'null': return new NullWidget(ctx, m, slot);
    case 'tuple': return new TupleWidget(ctx, m, slot);
    case 'array': return new ArrayWidget(ctx, m, slot);
    case 'union': return new UnionWidget(ctx, m, slot);
    case 'any': case 'data': return new AnyWidget(ctx, m, slot);
    case 'json': return new JsonWidget(ctx, m, slot);
  }
}
