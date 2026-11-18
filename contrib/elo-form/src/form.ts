/**
 * The form: a schema's widgets, kept honest by the schema itself.
 */
import { canEvaluate, check, fill, planSchema, resolveSchema, simplify } from './schema.js';
import type { Model, ResolveOptions, Schema } from './schema.js';
import { defaultMessages, mergeMessages } from './messages.js';
import type { Messages } from './messages.js';
import { h, humanize, make } from './widgets.js';
import type { Context, Widget, WidgetOptions } from './widgets.js';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface EloFormOptions extends ResolveOptions, Partial<WidgetOptions> {
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
}

export interface Problem {
  /** Where in the data, in Elo's notation: `.lines.0.qty`. */
  path: string;
  message: string;
}

export interface Result {
  /** True exactly when `raw |> Type` succeeds. */
  valid: boolean;
  /** What the form holds, as plain JSON: the input to give the schema. */
  raw: unknown;
  /** What the schema makes of it — coerced, with Luxon dates and durations. Only when valid. */
  value?: unknown;
  problems: Problem[];
  /** False where the page forbids evaluating compiled code: shapes are right, constraints are not checked. */
  enforced: boolean;
}

let forms = 0;

export class EloForm {
  readonly element: HTMLElement;
  readonly schema: Schema;
  readonly model: Model;
  private root: Widget;
  private ctx: Context;
  private listeners = new Set<(form: EloForm) => void>();
  private banner: HTMLElement;
  private hidden?: HTMLInputElement;
  private revealed = false;
  private last!: Result;

  constructor(source: string, options: EloFormOptions = {}) {
    this.schema = resolveSchema(source, options);
    this.model = planSchema(this.schema);
    const msgs = mergeMessages(defaultMessages, options.messages);
    this.ctx = {
      opts: {
        datetimeOffset: options.datetimeOffset ?? 'local',
        fallback: options.fallback,
        maxDepth: options.maxDepth ?? 12,
        guessFromNames: options.guessFromNames ?? true,
        labels: options.labels,
        units: options.units,
      },
      msgs,
      uid: `elo${++forms}`,
      seq: 0,
      budget: options.maxFields ?? 1500,
      byId: new Map(),
      notify: (w) => { this.touch(w); this.changed(); },
    };

    const named = this.schema.name ? humanize(this.schema.name) : undefined;
    this.root = make(this.ctx, this.model, {
      label: options.title ?? named ?? msgs.value,
      from: options.title !== undefined ? 'options.title' : named ? `type ${this.schema.name}` : 'messages.value',
      optional: false,
      // A tuple's fields speak for themselves; anything else needs to say what it is asking for.
      bare: !options.title && simplify(this.model).kind === 'tuple',
      depth: 0,
    });

    this.banner = h('p', { class: 'elo-error elo-banner', hidden: true, role: 'alert' });
    this.element = h('div', { class: 'elo-form' }, this.root.el, this.banner);
    if (!canEvaluate()) this.element.prepend(h('p', { class: 'elo-note elo-banner' }, msgs.unchecked));
    if (options.name) {
      this.hidden = h('input', { type: 'hidden', name: options.name });
      this.element.append(this.hidden);
    }

    const edited = (e: Event) => { this.touch(this.owner(e.target)); this.changed(); };
    this.element.addEventListener('input', edited);
    this.element.addEventListener('change', edited);
    // Leaving a field is when it may start saying what is wrong with it — but not its surroundings yet.
    this.element.addEventListener('focusout', (e) => {
      const w = this.owner(e.target);
      if (w && !w.touched) { w.touched = true; this.refresh(); }
    });

    if (options.onChange) this.listeners.add(options.onChange);
    if (options.value !== undefined) this.root.set(options.value);
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
          const r = check(w.model, value, input);
          if (!r.ok) message = w.explain(r, value, input);
        }
      }
    }
    if (message) { ok = false; problems.push({ path: w.path, message }); }
    w.showError(message && (this.revealed || w.touched) ? message : null);
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
      const r = check(this.model, raw, raw);
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
    this.last = { valid, raw, value, problems, enforced: canEvaluate() };
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

/** Build a form for an Elo type schema. Append `form.element` wherever it should appear. */
export function eloForm(source: string, options?: EloFormOptions): EloForm {
  return new EloForm(source, options);
}
