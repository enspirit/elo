/**
 * The form: a schema's widgets, kept honest by the schema itself.
 */
import { checkerFrom, fill, noChecks, simplify } from './plan.js';
import type { Checker, CompiledChecks, Plan } from './plan.js';
import { defaultMessages, mergeMessages } from './messages.js';
import type { Messages } from './messages.js';
import { h, withoutPage } from './dom.js';
import type { MiniElement } from './dom.js';
import { humanize, make } from './widgets.js';
import type { Context, Widget, WidgetOptions } from './widgets.js';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface FormOptions extends Partial<WidgetOptions> {
  /** Data to start from, as JSON: what an earlier `getRaw()` returned, or any input the schema accepts. */
  value?: unknown;
  /** A heading for the form. Without one, a tuple's fields are shown without a frame. */
  title?: string;
  /** Mirror the data, as JSON text, into a hidden input of this name — for a plain HTML form post. */
  name?: string;
  /** How many widgets to build before the rest is asked for as JSON files. */
  maxFields?: number;
  /** Override or translate any text the form shows. */
  messages?: DeepPartial<Messages>;
  onChange?: (form: EloForm) => void;
  /**
   * Elo's checks for this plan, compiled ahead of time: what the module written by
   * `compileChecks` exports. Without them the form asks for well-shaped data and enforces no
   * constraint: something else has to.
   */
  checks?: CompiledChecks;
  /** Problems found elsewhere — by the server that received the data — to show on their fields. */
  problems?: Reported[];
  /** Prefix of every element id in the form. Give one where two renderings must agree, or be repeatable. */
  id?: string;
  /** Say, above the form, that constraints are not checked here. For a page that expected them to be. */
  notice?: boolean;
}

export interface Problem {
  /** Where in the data, in Elo's notation: `.lines.0.qty`. */
  path: string;
  message: string;
}

/**
 * A problem found elsewhere. It may be an error of Elo's as it was caught — `path`, `message`,
 * `kind`, `label` — in which case a failed constraint is said in the field's own words rather
 * than in Elo's ("constraint failed").
 */
export interface Reported extends Problem {
  kind?: string;
  label?: string;
}

export interface Result {
  /** True exactly when `raw |> Type` succeeds. */
  valid: boolean;
  /** What the form holds, as plain JSON: the input to give the schema. */
  raw: unknown;
  /** What the schema makes of it — coerced, with Luxon dates and durations. Only when valid. */
  value?: unknown;
  problems: Problem[];
  /** False where nothing checks constraints here: shapes are right, the rest is for whoever receives the data. */
  enforced: boolean;
}

let forms = 0;

export class EloForm {
  readonly element: HTMLElement;
  readonly plan: Plan;
  private root: Widget;
  private checker: Checker;
  private ctx: Context;
  private listeners = new Set<(form: EloForm) => void>();
  private banner: HTMLElement;
  private hidden?: HTMLInputElement;
  private revealed = false;
  private last!: Result;

  /**
   * `checker` is for a form that brings its own way of asking Elo; `options.checks` is the usual one.
   */
  constructor(plan: Plan, options: FormOptions = {}, checker?: Checker) {
    if (!plan || plan.version !== 1 || !plan.root) throw new Error('Not a form plan: expected what planForm() returns.');
    this.plan = plan;
    this.checker = checker ?? (options.checks ? checkerFrom(options.checks) : noChecks);
    const msgs = mergeMessages(defaultMessages, options.messages);
    this.ctx = {
      opts: {
        datetimeOffset: options.datetimeOffset ?? 'local',
        fallback: options.fallback,
        maxDepth: options.maxDepth ?? 12,
        guessFromNames: options.guessFromNames ?? true,
        labels: options.labels,
        units: options.units,
        help: options.help,
        placeholders: options.placeholders,
        names: options.names,
      },
      msgs,
      checker: this.checker,
      uid: options.id ?? `elo${++forms}`,
      seq: 0,
      budget: options.maxFields ?? 1500,
      byId: new Map(),
      notify: (w) => { this.touch(w); this.changed(); },
    };

    const named = plan.name ? humanize(plan.name) : undefined;
    this.root = make(this.ctx, plan.root, {
      label: options.title ?? named ?? msgs.value,
      from: options.title !== undefined ? 'options.title' : named ? `type ${plan.name}` : 'messages.value',
      optional: false,
      // A tuple's fields speak for themselves; anything else needs to say what it is asking for.
      bare: !options.title && simplify(plan.root).kind === 'tuple',
      depth: 0,
    });

    this.banner = h('p', { class: 'elo-error elo-banner', hidden: true, role: 'alert' });
    this.element = h('div', { class: 'elo-form' }, this.root.el, this.banner);
    if (options.notice && !this.checker.enforced) this.element.prepend(h('p', { class: 'elo-note elo-banner' }, msgs.unchecked));
    if (options.name) {
      this.hidden = h('input', { type: 'hidden', name: options.name });
      this.element.append(this.hidden);
    }

    const edited = (e: Event) => {
      const w = this.owner(e.target);
      this.touch(w);
      // What was said about the old value says nothing about the new one.
      for (let x = w; x; x = x.parent) x.reported = null;
      this.changed();
    };
    this.element.addEventListener('input', edited);
    this.element.addEventListener('change', edited);
    // Leaving a field is when it may start saying what is wrong with it — but not its surroundings yet.
    this.element.addEventListener('focusout', (e) => {
      const w = this.owner(e.target);
      if (w && !w.touched) { w.touched = true; this.refresh(); }
    });

    if (options.onChange) this.listeners.add(options.onChange);
    if (options.value !== undefined) this.root.set(options.value);
    if (options.problems) this.report(options.problems);
    this.refresh();
  }

  private owner(target: EventTarget | null): Widget | undefined {
    const el = target && (target as Element).closest?.('[data-elo-id]');
    return el ? this.ctx.byId.get(el.getAttribute('data-elo-id')!) : undefined;
  }

  private touch(w: Widget | undefined): void {
    for (let x = w; x; x = x.parent) x.touched = true;
  }

  private changed(): void {
    this.refresh();
    for (const fn of this.listeners) fn(this);
    this.element.dispatchEvent(new CustomEvent('elo:change', { bubbles: true, detail: this.last }));
  }

  /** Check one widget and everything in it. Returns whether it is valid. */
  private visit(w: Widget, input: unknown, problems: Problem[]): boolean {
    let message: string | null = null;
    let ok = true;
    if (!(w.isBlank() && w.blankable)) {
      message = w.localError();
      if (!message && w.isBlank() && w.requiresInput()) message = w.missingMessage();
      if (!message) {
        for (const c of w.children()) ok = this.visit(c, input, problems) && ok;
        // A node is only checked once its parts are right: its own problem is then the only thing to say.
        if (ok && w.needsCheck()) {
          const value = w.value();
          const r = this.checker.check(w.model.id!, value, input);
          if (!r.ok) message = w.explain(r, value, input);
        }
      }
    }
    if (message) { ok = false; problems.push({ path: w.path, message }); }
    // What was reported from outside is shown whether or not the field was visited: it was submitted.
    const shown = message && (this.revealed || w.touched) ? message : w.reported;
    w.showError(shown);
    if (ok) w.afterCheck(input); else w.showNote(null);
    return ok;
  }

  private refresh(): Result {
    const raw = this.getRaw();
    const problems: Problem[] = [];
    let valid = this.visit(this.root, raw, problems);
    let value: unknown;
    let stray: string | null = null;
    if (valid) {
      // The last word is Elo's, on the whole value: whatever the widgets think, this is what counts.
      const r = this.checker.has(this.plan.root.id) ? this.checker.check(this.plan.root.id!, raw, raw) : { ok: true as const, value: undefined };
      if (r.ok) value = r.value;
      else {
        valid = false;
        stray = this.root.explain(r, raw, raw);
        problems.push({ path: r.path, message: stray });
      }
    }
    this.banner.textContent = stray ? fill(this.ctx.msgs.formError, { detail: stray }) : '';
    this.banner.hidden = !stray;
    if (this.hidden) this.hidden.value = JSON.stringify(raw);
    this.last = { valid, raw, value, problems, enforced: this.checker.enforced };
    return this.last;
  }

  /** What the form holds right now, as plain JSON. Missing required values are simply absent. */
  getRaw(): unknown {
    const v = this.root.value();
    return v === undefined ? null : v;
  }

  /** The current state, without changing what is shown. */
  get result(): Result { return this.last; }

  /**
   * Check everything and show every problem — what a submit button calls.
   * Pass `focus: true` to move to the first field that needs attention.
   */
  validate(opts: { focus?: boolean } = {}): Result {
    this.revealed = true;
    const result = this.refresh();
    if (!result.valid && opts.focus) this.firstInvalid(this.root)?.focus();
    return result;
  }

  private firstInvalid(w: Widget): Widget | undefined {
    for (const c of w.children()) {
      const found = this.firstInvalid(c);
      if (found) return found;
    }
    return w.el.classList.contains('elo-invalid') ? w : undefined;
  }

  private report(problems: Reported[]): Reported[] {
    for (const w of this.ctx.byId.values()) w.reported = null;
    // Only what is on show: the alternatives of a choice that are not the chosen one stay out of it.
    const live: Widget[] = [];
    const walk = (w: Widget) => { live.push(w); w.children().forEach(walk); };
    walk(this.root);
    const unplaced: Reported[] = [];
    for (const p of problems) {
      // The deepest widget at that place: a choice and its chosen alternative share one.
      const at = live.filter((w) => w.path === p.path).pop();
      if (!at) { unplaced.push(p); continue; }
      const text = p.kind === 'constraint'
        ? at.explain({ ok: false, path: '.', kind: 'constraint', label: p.label, message: p.message }, at.value(), this.getRaw())
        : p.message;
      at.reported = at.reported ? `${at.reported} ${text}` : text;
    }
    return unplaced;
  }

  /**
   * Show problems found elsewhere, each on the field at its `path` (`.lines.0.qty`, as Elo reports
   * it), until that field is next edited. Returns the ones that have no field to go on: those are
   * for the page to show. Call it with `[]` to clear them all. An error of Elo's can be passed as
   * it was caught: with its `kind` and `label`, a failed constraint is said as the field's hint says it.
   */
  setProblems(problems: Reported[]): Reported[] {
    const unplaced = this.report(problems);
    this.refresh();
    return unplaced;
  }

  /** Load data into the form: JSON as the schema would accept it. */
  setValue(value: unknown): void {
    this.root.set(value);
    this.changed();
  }

  /** Empty the form and forget what was shown as wrong. */
  reset(): void {
    this.root.set(undefined);
    for (const w of this.ctx.byId.values()) w.touched = false;
    this.revealed = false;
    this.changed();
  }

  /** Be told after every change. Returns a function that stops it. */
  onChange(fn: (form: EloForm) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

/** Build a form from a plan. Append `form.element` wherever it should appear. */
export function renderForm(plan: Plan, options?: FormOptions): EloForm {
  return new EloForm(plan, options);
}

/** A form built where there is no page: the same widgets, into elements that only know how to be written out. */
function offPage(plan: Plan, options: FormOptions): EloForm {
  return withoutPage(() => new EloForm(plan, { id: 'elo', ...options }));
}

/**
 * A form as HTML text, for a server to send. With `names`, its plain fields post by themselves;
 * `hydrateForm` then takes it over in the page.
 */
export function renderHtml(plan: Plan, options: FormOptions = {}): string {
  return offPage(plan, options).element.outerHTML;
}

/** A name and what was posted under it, in the order it was posted: what `URLSearchParams` and `FormData` iterate. */
export type Posted = Iterable<[string, unknown]>;

function fillIn(controls: Iterable<{ el: any; name: string }>, posted: Posted): void {
  const last = new Map<string, string>();
  for (const [name, value] of posted) if (typeof value === 'string') last.set(name, value);
  for (const { el, name } of controls) {
    if (!last.has(name)) continue;
    if (el.getAttribute('type') === 'checkbox') el.checked = last.get(name) === 'true';
    else el.value = last.get(name);
  }
}

/**
 * What a posted HTML form means: the fields a `renderHtml` form posted under their names, read
 * back the way the form itself reads them — numbers as numbers, an empty optional box as absent.
 * `options` must be those the form was rendered with; `value` supplies what was not posted.
 */
export function readPosted(plan: Plan, posted: Posted, options: FormOptions = {}): Result {
  const form = offPage(plan, options);
  const controls = [...(form.element as unknown as MiniElement).descendants()]
    .filter((el) => el.hasAttribute('data-elo-name'))
    .map((el) => ({ el, name: el.getAttribute('data-elo-name')! }));
  fillIn(controls, posted);
  return form.validate();
}

/**
 * Take over a form that arrived as HTML: build the live one from the same plan and options, keep
 * what was already typed into the plain fields, and put it in the place of `target` (the
 * `.elo-form` element, or something that holds it).
 */
export function hydrateForm(target: Element, plan: Plan, options: FormOptions = {}): EloForm {
  const old = target.matches('.elo-form') ? target : target.querySelector('.elo-form');
  const form = new EloForm(plan, options);
  if (old) {
    const typed: [string, string][] = [];
    for (const el of old.querySelectorAll<HTMLInputElement>('[data-elo-name]')) {
      typed.push([el.getAttribute('data-elo-name')!, el.type === 'checkbox' ? String(el.checked) : el.value]);
    }
    const controls = [...form.element.querySelectorAll('[data-elo-name]')].map((el) => ({ el, name: el.getAttribute('data-elo-name')! }));
    fillIn(controls, typed);
    old.replaceWith(form.element);
    form.setProblems(options.problems ?? []);
  } else {
    target.append(form.element);
  }
  return form;
}
