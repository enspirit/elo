/**
 * Where elements come from: the page's document, or a small stand-in for it.
 *
 * The widgets build a form out of elements, and nothing else knows how a form
 * is laid out. So a form written as HTML text — on a server, where there is no
 * page — is the same widgets building into the stand-in below, which is then
 * written out. One layout, two ways of delivering it.
 *
 * The stand-in is exactly as much of the DOM as the widgets use.
 */

type Kid = Node | string | null | undefined | false;

const VOID = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

class MiniText {
  parent: MiniElement | null = null;
  constructor(public data: string) {}
  get textContent() { return this.data; }
  get outerHTML() { return escapeText(this.data); }
  remove() { this.parent?.drop(this); }
}

type MiniNode = MiniElement | MiniText;

/** An element that remembers what was done to it and can write itself as HTML. */
export class MiniElement {
  readonly tagName: string;
  parent: MiniElement | null = null;
  readonly kids: MiniNode[] = [];
  private attrs = new Map<string, string>();
  private held: string | undefined;
  checked = false;
  /** Present so that `validity?.badInput` reads as "nothing wrong": there is nobody typing. */
  readonly validity = undefined;
  readonly files = undefined;

  constructor(tag: string) { this.tagName = tag.toUpperCase(); }

  // -- attributes ------------------------------------------------------------

  setAttribute(name: string, value: string) {
    if (name === 'checked') this.checked = true;
    else this.attrs.set(name, String(value));
  }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  hasAttribute(name: string) { return this.attrs.has(name); }

  private flag(name: string, on: boolean) { if (on) this.attrs.set(name, ''); else this.attrs.delete(name); }

  get id() { return this.attrs.get('id') ?? ''; }
  set id(v: string) { this.attrs.set('id', v); }
  get className() { return this.attrs.get('class') ?? ''; }
  set className(v: string) { this.attrs.set('class', v); }
  get title() { return this.attrs.get('title') ?? ''; }
  set title(v: string) { this.attrs.set('title', v); }
  get step() { return this.attrs.get('step') ?? ''; }
  set step(v: string) { this.attrs.set('step', v); }
  get type() { return this.attrs.get('type') ?? ''; }
  get hidden() { return this.attrs.has('hidden'); }
  set hidden(on: boolean) { this.flag('hidden', on); }
  get disabled() { return this.attrs.has('disabled'); }
  set disabled(on: boolean) { this.flag('disabled', on); }

  get classList() {
    const read = () => this.className.split(/\s+/).filter(Boolean);
    const write = (names: string[]) => { this.className = names.join(' '); };
    return {
      contains: (name: string) => read().includes(name),
      add: (name: string) => { if (!read().includes(name)) write([...read(), name]); },
      remove: (name: string) => write(read().filter((n) => n !== name)),
      toggle: (name: string, on?: boolean) => {
        const want = on ?? !read().includes(name);
        write(want ? [...read().filter((n) => n !== name), name] : read().filter((n) => n !== name));
        return want;
      },
    };
  }

  // -- what a control holds --------------------------------------------------

  get options(): MiniElement[] {
    return this.kids.filter((k): k is MiniElement => k instanceof MiniElement && k.tagName === 'OPTION');
  }

  get value(): string {
    if (this.tagName === 'SELECT') {
      // As in a browser: what was chosen if it is on the list, else the first choice.
      const options = this.options;
      if (this.held !== undefined && options.some((o) => o.value === this.held)) return this.held;
      return options[0]?.value ?? '';
    }
    if (this.tagName === 'OPTION') return this.attrs.get('value') ?? this.textContent;
    return this.held ?? this.attrs.get('value') ?? '';
  }
  set value(v: string) { this.held = String(v); }

  // -- tree -------------------------------------------------------------------

  get children(): MiniElement[] { return this.kids.filter((k): k is MiniElement => k instanceof MiniElement); }

  private adopt(kid: MiniNode | string): MiniNode {
    const node = typeof kid === 'string' ? new MiniText(kid) : kid;
    node.parent?.drop(node);
    node.parent = this;
    return node;
  }
  drop(kid: MiniNode) {
    const i = this.kids.indexOf(kid);
    if (i >= 0) this.kids.splice(i, 1);
    kid.parent = null;
  }
  append(...kids: (MiniNode | string)[]) { for (const k of kids) this.kids.push(this.adopt(k)); }
  prepend(...kids: (MiniNode | string)[]) { this.kids.unshift(...kids.map((k) => this.adopt(k))); }
  insertBefore(kid: MiniNode, before: MiniNode | null) {
    const node = this.adopt(kid);
    const i = before ? this.kids.indexOf(before) : -1;
    if (i < 0) this.kids.push(node); else this.kids.splice(i, 0, node);
    return node;
  }
  replaceChildren(...kids: (MiniNode | string)[]) {
    for (const k of [...this.kids]) this.drop(k);
    this.append(...kids);
  }
  remove() { this.parent?.drop(this); }

  get textContent(): string { return this.kids.map((k) => k.textContent).join(''); }
  set textContent(text: string) { this.replaceChildren(...(text === '' ? [] : [text])); }

  /** Every element below this one, in document order. */
  *descendants(): Generator<MiniElement> {
    for (const k of this.children) { yield k; yield* k.descendants(); }
  }

  // -- things only a live page does -------------------------------------------

  addEventListener() { /* nobody is there to cause an event */ }
  dispatchEvent() { return true; }
  focus() { /* nothing to focus */ }
  closest() { return null; }
  querySelector() { return null; }

  // -- writing it out ----------------------------------------------------------

  get outerHTML(): string {
    const tag = this.tagName.toLowerCase();
    const attrs = new Map(this.attrs);
    if (tag === 'input') {
      const type = attrs.get('type');
      if (type === 'checkbox' || type === 'radio') { if (this.checked) attrs.set('checked', ''); }
      else if (type !== 'file' && this.held !== undefined && this.held !== '') attrs.set('value', this.held);
    }
    if (tag === 'option' && this.parent?.tagName === 'SELECT' && this.parent.held !== undefined
      && this.parent.value === this.value && this.parent.options.find((o) => o.value === this.value) === this) {
      attrs.set('selected', '');
    }
    const open = `<${tag}${[...attrs].map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`)).join('')}>`;
    if (VOID.has(tag)) return open;
    const inner = tag === 'textarea' ? escapeText(this.held ?? '') : this.kids.map((k) => k.outerHTML).join('');
    return `${open}${inner}</${tag}>`;
  }
}

/** The part of `document` the widgets use. */
export interface Doc { createElement(tag: string): any }

const mini: Doc = { createElement: (tag) => new MiniElement(tag) };

let current: Doc | undefined;

/** Run `build` with elements made by the stand-in rather than by a page. */
export function withoutPage<T>(build: () => T): T {
  const before = current;
  current = mini;
  try { return build(); } finally { current = before; }
}

/** Is this an element of the given tag — in a page, or in the stand-in? */
export function isTag(el: unknown, tag: string): boolean {
  return !!el && typeof el === 'object' && (el as { tagName?: string }).tagName === tag.toUpperCase();
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, unknown> = {}, ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const el = (current ?? document).createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid || kid === '') el.append(kid);
  return el;
}
