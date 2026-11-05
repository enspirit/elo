/**
 * The form, and the page — §6.
 *
 * One template for the whole catalogue, and **no per-formula code anywhere**:
 * everything on the page is read from the bundle. The form comes from
 * `fields.elo`, which is the whole reason that file exists as data rather than
 * as a type a form builder would have to walk; the prose comes from the doc
 * comment; the table comes from `cases.elo`.
 *
 * Two properties are worth stating because they constrain the markup:
 *
 * - **The form works with no JavaScript.** Its method is `GET` and its action
 *   is the formula's `call`, so submitting it lands on a URL that *is* the
 *   answer — linkable, bookmarkable, and the same resource a program would
 *   call. The page then *enhances* that form with a script: the same request,
 *   made with `fetch`, rendered under the form, with a refusal put back on the
 *   field that caused it. Turn the script off and the form still works, which
 *   is the test of whether the enhancement was written the right way round.
 *   The fragment of `/{id}/form` carries no script at all — it is markup to
 *   embed, and the host that embeds it has its own ideas.
 * - **Everything a bundle wrote is text, never markup.** A label, a help
 *   line, an option, a case name and the doc comment all come from files in a
 *   repository, and they are escaped here. The Markdown rendering below runs
 *   *after* escaping, over a deliberately small subset, so there is no path
 *   from a bundle to a tag this file did not write.
 */

import type { FieldDescriptor, FormulaCase } from './bundle';
import type { IndexEntry, ServedFormula } from './catalogue';

/** Text, as text. The five that matter in both a body and an attribute. */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A deliberately small Markdown: paragraphs, `code`, **strong**, _emphasis_,
 * links, bullet lists and fenced blocks.
 *
 * It runs on already-escaped text, which is what makes it safe — the input
 * cannot introduce a tag, because `<` is `&lt;` before this looks at it — and
 * it is small because a doc comment is prose, not a document. A bundle that
 * wants more than this is telling us something about the format rather than
 * about the renderer.
 */
export function markdown(source: string): string {
  const escaped = escapeHtml(source);
  const blocks = escaped.split(/\n{2,}/);
  return blocks.map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
      const items = lines.map(line => `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      return `<ul>${items.join('')}</ul>`;
    }
    if (lines.every(line => /^ {4}/.test(line))) {
      return `<pre><code>${lines.map(line => line.slice(4)).join('\n')}</code></pre>`;
    }
    return `<p>${inline(lines.join('\n'))}</p>`;
  }).join('\n');
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:])/g, '$1<em>$2</em>')
    // A link's target is checked rather than trusted: a bundle is reviewed
    // content, but `javascript:` in a doc comment should still not become a
    // link, and saying so here costs one regexp.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

/**
 * The `<form>` of §6, from `fields.elo` and nothing else.
 *
 * `action` is an absolute path rather than the `../call` the plan wrote: the
 * fragment is served at `/{id}/form` *and* embedded in the page at `/{id}`,
 * and no single relative reference resolves to the call from both. The links
 * of the descriptor are absolute for the same reason.
 */
export function formFragment(formula: ServedFormula): string {
  const fields = formula.descriptor.fields;
  const action = formula.descriptor.links.call;

  // A table is not something a page can ask for a value at a time, so a
  // formula that takes one gets a way to send one instead. Its `fields` are
  // still worth having: for a tabular input they are the *columns*.
  if (formula.tabular.input) {
    return [
      '<div class="elo-form">',
      '  <p class="elo-note">This formula takes a <strong>table</strong>: one row in, one row'
      + ' out. No HTML form can ask for that a value at a time, so a call takes the whole'
      + ' table as its body — as CSV, whose columns are:</p>',
      `  <p>${fields.map(field =>
        `<code>${escapeHtml(field.path)}</code>`).join(', ')}</p>`,
      `  <pre><code>curl -X POST -H 'Content-Type: text/csv' -H 'Accept: text/csv' \\\n`
      + `    --data-binary @rows.csv "$ELO_FORMULA_SERVICE${escapeHtml(action)}"</code></pre>`,
      '</div>',
    ].join('\n');
  }

  const controls = fields.map(field => control(field)).join('\n');
  return [
    `<form class="elo-form" action="${escapeHtml(action)}" method="get">`,
    controls,
    '  <p><button type="submit">Answer</button></p>',
    '</form>',
  ].join('\n');
}

function control(field: FieldDescriptor): string {
  const id = `f-${field.path}`;
  const name = escapeHtml(field.path);
  const required = field.required ? ' required' : '';
  const described = field.help ? ` aria-describedby="${escapeHtml(id)}-help"` : '';
  const common = `id="${escapeHtml(id)}" name="${name}"${required}${described}`;

  let input: string;
  if (field.options) {
    const options = [
      ...(field.required ? [] : ['<option value=""></option>']),
      ...field.options.map(option =>
        `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`),
    ];
    input = `<select ${common}>${options.join('')}</select>`;
  } else if (field.widget === 'checkbox') {
    // Unticked, a checkbox sends nothing at all. The hidden field before it
    // sends `false`, the box sends `true` over the top of it, and the call
    // takes the last value of a field it was given twice — so a Bool always
    // arrives, which is what a required Bool means.
    input = `<input type="hidden" name="${name}" value="false">`
      + `<input type="checkbox" ${common} value="true">`;
  } else if (field.widget === 'json') {
    input = `<textarea ${common} rows="4"></textarea>`;
  } else {
    input = `<input ${common} type="${inputType(field)}"${attributes(field)}>`;
  }

  // A repeated field is three empty boxes under one name: the call reads a
  // repeated parameter as a list, and drops the ones left empty.
  const body = field.repeated ? [input, control_repeat(field, 2)].join('') : input;

  return [
    '  <p class="elo-field">',
    `    <label for="${escapeHtml(id)}">${escapeHtml(field.label)}</label>`,
    `    ${body}`,
    field.help ? `    <span class="elo-help" id="${escapeHtml(id)}-help">${escapeHtml(field.help)}</span>` : '',
    '  </p>',
  ].filter(line => line !== '').join('\n');
}

/** The extra boxes of a repeated field, which carry no id of their own. */
function control_repeat(field: FieldDescriptor, howMany: number): string {
  const name = escapeHtml(field.path);
  return Array.from({ length: howMany }, () =>
    `<input name="${name}" type="${inputType(field)}"${attributes(field)}>`).join('');
}

const INPUT_TYPES: Record<string, string> = {
  number: 'number',
  checkbox: 'checkbox',
  date: 'date',
  datetime: 'datetime-local',
  duration: 'text',
  password: 'password',
  text: 'text',
};

function inputType(field: FieldDescriptor): string {
  return INPUT_TYPES[field.widget] ?? 'text';
}

/**
 * What the type adds to a control, and the only place the form says anything
 * about validity: `step` tells an Int from a Float, and a `Duration` gets a
 * pattern-free placeholder rather than a wrong pattern. A *bound* lives in an
 * Elo predicate and is reported by §5 — a form cannot enforce one, and
 * pretending otherwise would be a second copy of the rule.
 */
function attributes(field: FieldDescriptor): string {
  const bits: string[] = [];
  if (field.widget === 'number') bits.push(field.type === 'Int' ? ' step="1"' : ' step="any"');
  if (field.widget === 'duration' && !field.placeholder) bits.push(' placeholder="P1Y2M3D"');
  if (field.placeholder) bits.push(` placeholder="${escapeHtml(field.placeholder)}"`);
  return bits.join('');
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const STYLE = `
  :root { color-scheme: light dark; --rule: #8884; }
  body { margin: 0 auto; max-width: 46rem; padding: 2rem 1rem 6rem;
         font: 16px/1.55 system-ui, sans-serif; }
  h1 { font-size: 1.6rem; margin: 0 0 .2rem; }
  .elo-meta { color: #8a8a8a; margin: 0 0 2rem; }
  .elo-meta a { color: inherit; }
  code, pre { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .9em; }
  pre { overflow-x: auto; padding: .8rem; background: #8881; border-radius: 4px; }
  .elo-field { display: grid; gap: .25rem; margin: 0 0 1rem; }
  .elo-field label { font-weight: 600; }
  .elo-field input, .elo-field select, .elo-field textarea {
    font: inherit; padding: .4rem; max-width: 24rem; }
  .elo-field input[type=checkbox] { width: 1rem; }
  .elo-help { color: #8a8a8a; font-size: .85em; }
  .elo-note { color: #8a8a8a; }
  button { font: inherit; padding: .5rem 1.2rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid var(--rule); padding: .4rem .5rem;
           text-align: left; vertical-align: top; font-size: .9em; }
  td code { white-space: pre-wrap; word-break: break-word; }
  details { margin: 1rem 0; }
  summary { cursor: pointer; }
  .elo-result { margin: 1.5rem 0; padding: 0 0 0 .8rem; border-left: 3px solid var(--rule); }
  .elo-result[hidden] { display: none; }
  .elo-result-status { font-weight: 600; margin: 0 0 .5rem; }
  .elo-result.is-refused { border-left-color: #c0392b; }
  .elo-result.is-refused .elo-result-status { color: #c0392b; }
  .elo-error { color: #c0392b; font-size: .85em; }
  [aria-invalid="true"] { outline: 2px solid #c0392b; }
  .elo-permalink { font-size: .85em; }
  .elo-snippets h3 { font-size: .95rem; margin: 1.2rem 0 .3rem; }
`;

/**
 * The page of §6: the documentation, the form, the cases, the source — and the
 * snippets that call it from somewhere else.
 *
 * `origin` is where this service is answering from (`http://localhost:8080`),
 * read off the request, so that the snippets are copy-pasteable rather than
 * illustrative. A page that does not know it falls back to relative URLs,
 * which still work in the form and in `fetch`.
 */
export function formulaPage(formula: ServedFormula, origin = ''): string {
  const { descriptor } = formula;
  const title = `${descriptor.title} — ${descriptor.id} ${descriptor.version}`;
  const tags = descriptor.tags.map(tag =>
    `<a href="/?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join(', ');

  return document(title, [
    `<p class="elo-meta"><a href="/">catalogue</a> / ${escapeHtml(descriptor.id)}</p>`,
    `<h1>${escapeHtml(descriptor.title)}</h1>`,
    `<p class="elo-meta">${escapeHtml(descriptor.id)} ${escapeHtml(descriptor.version)}`
    + `${tags === '' ? '' : ` · ${tags}`}`
    + `${descriptor.license ? ` · ${escapeHtml(descriptor.license)}` : ''}</p>`,
    descriptor.doc === '' ? '' : markdown(descriptor.doc),
    '<h2>Try it</h2>',
    formFragment(formula),
    resultPanel(),
    answerTable(formula),
    caseTable(formula),
    snippets(formula, origin),
    sources(formula),
    // Only where there is a form to enhance. A formula that takes a table has
    // none, so the script would load, find nothing and return — which is
    // harmless and still a page that said it needed JavaScript when it did not.
    formula.tabular.input ? '' : ENHANCEMENT,
  ]);
}

/**
 * Where an answer lands when the script is doing the asking.
 *
 * Empty and hidden until then: with no script, nothing here is ever shown and
 * the form navigates to the answer's own URL instead.
 */
function resultPanel(): string {
  return [
    '<div class="elo-result" hidden>',
    '  <p class="elo-result-status"></p>',
    '  <table class="elo-answer"><tbody></tbody></table>',
    '  <pre class="elo-raw"></pre>',
    '  <p class="elo-permalink"></p>',
    '</div>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Calling it from somewhere else
// ---------------------------------------------------------------------------

/**
 * The same call, in the four things people reach for.
 *
 * Every snippet is filled in with the formula's **first case** — a real input
 * that really answers, rather than `{"field": "value"}` — because the case was
 * already a request body by construction. So a snippet is a thing to paste and
 * run, and if it stops working the case table above it is wrong too.
 */
function snippets(formula: ServedFormula, origin: string): string {
  const url = `${origin}${formula.descriptor.links.call}`;
  const example = formula.descriptor.cases[0];
  const input = example === undefined ? {} : example.input;
  const json = JSON.stringify(input);
  const pretty = JSON.stringify(input, null, 2);
  const link = example === undefined ? undefined : tryLink(formula, example);

  const curl = [
    `curl -X POST '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${json}'`,
    ...(link === undefined ? [] : ['', '# the same call as a URL, which is linkable and cacheable',
      `curl '${origin}${link}'`]),
    ...(formula.tabular.input ? ['', '# or the whole table at once',
      `curl -X POST '${url}' -H 'Content-Type: text/csv' --data-binary @rows.csv`] : []),
  ].join('\n');

  const javascript = [
    `const response = await fetch('${url}', {`,
    `  method: 'POST',`,
    `  headers: { 'Content-Type': 'application/json' },`,
    `  body: JSON.stringify(${pretty.replace(/\n/g, '\n  ')})`,
    `});`,
    `const answer = await response.json();`,
    `if (!response.ok) throw new Error(answer.message);  // 422 carries kind, path, field, label`,
    `console.log(answer);`,
  ].join('\n');

  const ruby = [
    `require 'json'`,
    `require 'net/http'`,
    ``,
    `response = Net::HTTP.post(`,
    `  URI('${url}'),`,
    `  JSON.generate(${rubyLiteral(input)}),`,
    `  'Content-Type' => 'application/json'`,
    `)`,
    `answer = JSON.parse(response.body)`,
    `raise answer['message'] unless response.code == '200'`,
    `pp answer`,
  ].join('\n');

  const python = [
    `import json, urllib.error, urllib.request`,
    ``,
    `request = urllib.request.Request(`,
    `    '${url}',`,
    `    data=json.dumps(${pythonLiteral(input)}).encode(),`,
    `    headers={'Content-Type': 'application/json'},`,
    `)`,
    `try:`,
    `    with urllib.request.urlopen(request) as response:`,
    `        print(json.load(response))`,
    `except urllib.error.HTTPError as refusal:`,
    `    print(refusal.code, json.load(refusal))`,
  ].join('\n');

  return [
    '<h2>Call it from your code</h2>',
    '<div class="elo-snippets">',
    `<p class="elo-note">Filled in with the first case, so each of these answers`
    + ` <code>${escapeHtml(JSON.stringify(example === undefined ? null : example.expect))}</code>`
    + ` as it stands.</p>`,
    ...[['curl', curl], ['JavaScript', javascript], ['Ruby', ruby], ['Python', python]]
      .map(([name, code]) => `<h3>${escapeHtml(name)}</h3><pre><code>${escapeHtml(code)}</code></pre>`),
    '</div>',
  ].join('\n');
}

/** A JSON-shaped value as Ruby, which is JSON with `=>` and no `null`. */
function rubyLiteral(value: unknown): string {
  if (value === null) return 'nil';
  if (Array.isArray(value)) return `[${value.map(rubyLiteral).join(', ')}]`;
  if (typeof value === 'object') {
    const pairs = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `'${key}' => ${rubyLiteral(item)}`);
    return `{ ${pairs.join(', ')} }`;
  }
  return JSON.stringify(value);
}

/** The same, as Python: `None`, `True`, `False`. */
function pythonLiteral(value: unknown): string {
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`;
  if (typeof value === 'object') {
    const pairs = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `'${key}': ${pythonLiteral(item)}`);
    return `{${pairs.join(', ')}}`;
  }
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// The enhancement
// ---------------------------------------------------------------------------

/**
 * The form, made to answer in place.
 *
 * It is an *enhancement*, and written the way round that word implies: the
 * markup above works without it, and this intercepts the submit it would
 * otherwise do, makes the same request with `fetch`, and renders the answer
 * under the form instead of navigating to it. The permalink it shows is the
 * URL the plain form would have gone to, so nothing is lost by enhancing.
 *
 * Two things it does that the plain form cannot:
 *
 * - **A refusal lands on the field that caused it.** §5 answers `field`, which
 *   is the key of `fields.elo` and therefore the `name` of a control on this
 *   page — so the message goes under that control, which is the whole reason
 *   the error body carries it.
 * - **The answer is read rather than replaced by.** The page stays, the form
 *   keeps what was typed, and a second call is one click away.
 *
 * Every value it writes goes in through `textContent`. The service's own
 * answers are data, and data does not become markup on the way to a page.
 */
const ENHANCEMENT = `<script>
(function () {
  var form = document.querySelector('form.elo-form');
  var panel = document.querySelector('.elo-result');
  if (!form || !panel || !window.fetch) return;

  var status = panel.querySelector('.elo-result-status');
  var rows = panel.querySelector('.elo-answer tbody');
  var raw = panel.querySelector('.elo-raw');
  var permalink = panel.querySelector('.elo-permalink');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearRefusals();

    var query = new URLSearchParams(new FormData(form)).toString();
    var url = form.getAttribute('action') + (query ? '?' + query : '');

    status.textContent = 'Calling…';
    panel.hidden = false;
    panel.classList.remove('is-refused');

    fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (response) {
        return response.json().then(function (body) {
          render(response.status, body, url);
        });
      })
      .catch(function (error) {
        show('The call could not be made: ' + error.message, true);
      });
  });

  function render(code, body, url) {
    rows.textContent = '';
    raw.textContent = '';
    permalink.textContent = '';

    if (code === 200) {
      show('200 — answered', false);
      if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
        Object.keys(body).forEach(function (key) {
          append(key, body[key]);
        });
      } else {
        append('the answer', body);
      }
      raw.textContent = JSON.stringify(body, null, 2);
      var link = document.createElement('a');
      link.setAttribute('href', url);
      link.textContent = url;
      permalink.appendChild(document.createTextNode('This answer has a URL: '));
      permalink.appendChild(link);
      return;
    }

    show(code + ' — ' + (body && body.message ? body.message : 'refused'), true);
    if (body && body.label) append('rule', body.label);
    if (body && body.kind) append('kind', body.kind);
    if (body && body.field) refuse(body.field, body.message);
  }

  function append(key, value) {
    var row = document.createElement('tr');
    var name = document.createElement('th');
    var held = document.createElement('td');
    name.textContent = key;
    held.textContent = value === null ? 'null' : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
    row.appendChild(name);
    row.appendChild(held);
    rows.appendChild(row);
  }

  function show(message, refused) {
    status.textContent = message;
    panel.hidden = false;
    panel.classList.toggle('is-refused', !!refused);
  }

  function refuse(field, message) {
    var control = form.querySelector('[name="' + field.replace(/"/g, '') + '"]');
    if (!control) return;
    control.setAttribute('aria-invalid', 'true');
    var said = document.createElement('span');
    said.className = 'elo-error';
    said.textContent = message || 'refused';
    control.parentNode.appendChild(said);
  }

  function clearRefusals() {
    Array.prototype.forEach.call(form.querySelectorAll('.elo-error'), function (said) {
      said.parentNode.removeChild(said);
    });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (control) {
      control.removeAttribute('aria-invalid');
    });
  }
})();
</script>`;

/**
 * The cases, each with a link that runs it.
 *
 * A case's input is a request body by construction, so it is also a query
 * string: "try this" is the case itself, unchanged, which is what makes the
 * documentation of a formula its test suite rather than a claim about it.
 */
function caseTable(formula: ServedFormula): string {
  const rows = formula.descriptor.cases.map(testCase => {
    const link = tryLink(formula, testCase);
    const name = escapeHtml(testCase.name);
    return [
      '<tr>',
      `<td>${link === undefined ? name : `<a href="${escapeHtml(link)}">${name}</a>`}</td>`,
      `<td><code>${escapeHtml(JSON.stringify(testCase.input))}</code></td>`,
      `<td><code>${escapeHtml(stringify(testCase.expect))}</code></td>`,
      '</tr>',
    ].join('');
  });
  return [
    `<h2>Cases</h2>`,
    '<table>',
    '<thead><tr><th>Case</th><th>Input</th><th>Answers</th></tr></thead>',
    `<tbody>${rows.join('')}</tbody>`,
    '</table>',
  ].join('\n');
}

/** A `GET …/call?…` for a case whose input a query string can carry. */
function tryLink(formula: ServedFormula, testCase: FormulaCase): string | undefined {
  const input = testCase.input;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null) continue;
    if (Array.isArray(value)) {
      if (value.some(item => item !== null && typeof item === 'object')) return undefined;
      for (const item of value) query.append(key, String(item));
      continue;
    }
    // A nested record would need a dotted path per leaf; the call reads those,
    // and a link for one is worth writing the day a bundle has one.
    if (typeof value === 'object') return undefined;
    query.append(key, String(value));
  }
  return `${formula.descriptor.links.call}?${query.toString()}`;
}

/** What the answer holds, from `Output` — the column list of §3. */
function answerTable(formula: ServedFormula): string {
  const rows = formula.descriptor.answers.map(answer => [
    '<tr>',
    `<td><code>${escapeHtml(answer.path)}</code></td>`,
    `<td>${escapeHtml(answer.type)}${answer.repeated ? '[]' : ''}</td>`,
    `<td>${answer.required ? 'always' : 'may be null'}</td>`,
    '</tr>',
  ].join(''));
  return [
    '<h2>The answer</h2>',
    '<table>',
    '<thead><tr><th>Key</th><th>Type</th><th></th></tr></thead>',
    `<tbody>${rows.join('')}</tbody>`,
    '</table>',
  ].join('\n');
}

/**
 * The program, behind a disclosure.
 *
 * Not a paraphrase of the computation: the exact source that answers, and the
 * compiled forms beside it. It is the strongest claim a formula service can
 * make about what it did, and it costs nothing — the compiler is already here.
 */
function sources(formula: ServedFormula): string {
  const links = [
    ...['types.elo', 'formula.elo', 'fields.elo', 'cases.elo', 'bundle.json'].map(file =>
      `<a href="${escapeHtml(`${formula.descriptor.links.self}/${file}`)}">${escapeHtml(file)}</a>`),
  ].join(' · ');
  // Media types rather than links: a representation is chosen with `Accept`,
  // which a link cannot carry. Saying so is more useful than a link that lies.
  const compiled = formula.descriptor.targets
    .map(target => `<code>${escapeHtml(MEDIA_TYPES[target] ?? target)}</code>`)
    .join(' · ');

  return [
    '<h2>What runs</h2>',
    '<details>',
    '<summary>The program this service applies, and the files it comes from</summary>',
    `<pre><code>${escapeHtml(formula.representations.elo)}</code></pre>`,
    `<p class="elo-meta">The bundle: ${links}</p>`,
    `<p class="elo-meta">The same program compiled — ask for it with <code>Accept</code>:`
    + ` ${compiled}</p>`,
    '</details>',
  ].join('\n');
}

/** What `Accept` a client sends for each compiled representation. */
const MEDIA_TYPES: Record<string, string> = {
  js: 'application/javascript',
  ruby: 'text/x-ruby',
  python: 'text/x-python',
};

/** The index of §7, in HTML, so that the service is browsable from `/`. */
export function cataloguePage(
  entries: IndexEntry[],
  folders: string[],
  prefix: string
): string {
  const rows = entries.map(entry => [
    '<tr>',
    `<td><a href="${escapeHtml(entry.links.latest)}">${escapeHtml(entry.id)}</a></td>`,
    `<td>${escapeHtml(entry.title)}</td>`,
    `<td>${entry.tags.map(tag => escapeHtml(tag)).join(', ')}</td>`,
    `<td>${escapeHtml(entry.version)}</td>`,
    '</tr>',
  ].join(''));

  const up = prefix === ''
    ? ''
    : `<p class="elo-meta"><a href="/">catalogue</a> / ${escapeHtml(prefix)}</p>`;

  return document(prefix === '' ? 'Formulas' : `Formulas under ${prefix}`, [
    up,
    `<h1>${prefix === '' ? 'Formulas' : escapeHtml(prefix)}</h1>`,
    `<p class="elo-meta">${entries.length} formula${entries.length === 1 ? '' : 's'}.`
    + ' Each one is a question with an answer, and a URL that answers it.</p>',
    folders.length === 0 ? '' : `<p>Folders: ${folders.map(folder =>
      `<a href="${escapeHtml(`/${folder}/`)}">${escapeHtml(folder)}</a>`).join(' · ')}</p>`,
    '<table>',
    '<thead><tr><th>Formula</th><th>Question</th><th>Tags</th><th>Version</th></tr></thead>',
    `<tbody>${rows.join('')}</tbody>`,
    '</table>',
  ]);
}

function document(title: string, body: string[]): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    ...body.filter(part => part !== ''),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** A case's expect, as the page shows it: JSON, since that is what it is. */
function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
