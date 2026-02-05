import { Controller } from '@hotwired/stimulus';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { DateTime, Duration, Interval } from 'luxon';
import {
  parse,
  compileToRuby,
  compileToJavaScript,
  compileToJavaScriptWithMeta,
  compileToSQL,
  compileToPython,
  getPrelude,
  defaultFormats,
  getFormat
} from '@enspirit/elo';
import type { PreludeTarget } from '@enspirit/elo';
import { elo } from '@enspirit/codemirror-lang-elo';
import { eloDarkTheme, eloLightTheme } from '../codemirror/elo-theme';
import { highlightJS, highlightRuby, highlightSQL, highlightPython } from '../highlighter';
import { formatCode } from '../formatters';

// Make luxon DateTime and Duration available globally for eval (used by compiled IIFE helpers)
(window as any).DateTime = DateTime;
(window as any).Duration = Duration;
(window as any).Interval = Interval;

type TargetLanguage = 'ruby' | 'javascript' | 'sql' | 'python';

const STORAGE_KEY = 'elo-playground-code';

const EXAMPLES: Record<string, string> = {
  arithmetic: `2 + 3 * 4`,
  strings: `let greeting = 'hello world' in
  upper(greeting)`,
  booleans: `let age = 25 in
  age >= 18 and age < 65`,
  conditionals: `let score = 85 in
  if score >= 90 then 'A'
  else if score >= 80 then 'B'
  else if score >= 70 then 'C'
  else 'F'`,
  variables: `let width = 10,
    height = 5,
    area = width * height
in area`,
  tuples: `let person = {
  name: 'Alice',
  age: 30,
  city: 'Brussels'
} in person.name`,
  lists: `let numbers = [1, 2, 3, 4, 5] in {
  first: first(numbers),
  last: last(numbers),
  length: length(numbers)
}`,
  nulls: `let value = null in
  value | 'default'`,
  lambdas: `let double = fn(x ~> x * 2),
    add = fn(a, b ~> a + b)
in add(double(5), 3)`,
  'map-filter': `let numbers = [1, 2, 3, 4, 5] in {
  doubled: map(numbers, fn(x ~> x * 2)),
  evens: filter(numbers, fn(x ~> x % 2 == 0)),
  sum: reduce(numbers, 0, fn(acc, x ~> acc + x))
}`,
  pipes: `'  hello world  '
  |> trim
  |> upper
  |> length`,
  dates: `let today = TODAY,
    nextWeek = today + P7D
in {
  year: year(today),
  month: month(today)
}`,
  durations: `P1D + PT2H`,
  'input-json': `_.price * _.quantity`,
  'input-csv': `_
  |> filter(r ~> Int(r.age) >= 30)
  |> map(r ~> r.name)`,
  'fetch-tuple': `# Extract multiple paths into a named structure
fetch(_, {
  fullName: .user.name,
  userCity: .user.address.city,
  itemCount: .order.items.0
})`,
  'fetch-list': `# Extract paths into a list, then process
fetch(_, [.scores.0, .scores.1, .scores.2])
  |> reduce(0, fn(sum, x ~> sum + x))`,
  'type-simple': `let Person = { name: String, age: Int } in
{ name: 'Alice', age: '30' } |> Person`,
  'type-validation': `let
  Age = Int(a | a >= 0),
  Person = { name: String, age: Age }
in _ |> Person`,
  'type-constraints': `let
  # Labeled constraint (Finitio-style)
  Positive = Int(i | positive: i > 0),

  # Multiple constraints
  PosEven = Int(i | positive: i > 0, even: i % 2 == 0),

  # String message for clear errors
  Adult = Int(a | 'must be 18 or older': a >= 18),

  # Constraints in schemas
  Person = { name: String, age: Adult }
in
  { name: 'Alice', age: '30' } |> Person`,
  'guard-basic': `# Simple guard: fail if condition is false
guard 10 > 0 in 10 * 2`,
  'guard-labeled': `# Labeled guards with preconditions
guard
  positive: _.age > 0,
  adult: _.age >= 18
in
  'Welcome, adult user!'`,
  'guard-pipe': `# Pipe-style guard: validate in pipeline
let double = fn(n ~> n * 2) in
  5 |> guard(x | positive: x > 0) |> double`
};

interface ExampleInput {
  data: string;
  format: 'json' | 'csv';
}

const EXAMPLE_INPUTS: Record<string, ExampleInput> = {
  'input-json': { data: `{"price": 100, "quantity": 2}`, format: 'json' },
  'input-csv': { data: `name,age,city
Alice,30,Brussels
Bob,25,Paris
Carol,35,London`, format: 'csv' },
  'fetch-tuple': { data: `{
  "user": {
    "name": "Alice Smith",
    "address": { "city": "Brussels", "country": "Belgium" }
  },
  "order": { "items": [3, 5, 2] }
}`, format: 'json' },
  'fetch-list': { data: `{"scores": [85, 92, 78]}`, format: 'json' },
  'type-validation': { data: `{"name": "Alice", "age": "30"}`, format: 'json' },
  'guard-labeled': { data: `{"age": 25}`, format: 'json' }
};

export default class PlaygroundController extends Controller {
  static targets = ['editor', 'inputEditor', 'output', 'language', 'pretty', 'prelude', 'inputFormat', 'outputFormat', 'error', 'result', 'resultPanel', 'copyButton', 'saveButton', 'examples', 'inputAccordion', 'inputToggle', 'inputBody', 'settingsToggle', 'settingsMenu', 'compiledAccordion', 'compiledToggle', 'compiledBody'];

  declare editorTarget: HTMLDivElement;
  declare inputEditorTarget: HTMLDivElement;
  declare outputTarget: HTMLPreElement;
  declare languageTarget: HTMLSelectElement;
  declare prettyTarget: HTMLInputElement;
  declare preludeTarget: HTMLInputElement;
  declare inputFormatTarget: HTMLSelectElement;
  declare outputFormatTarget: HTMLSelectElement;
  declare errorTarget: HTMLDivElement;
  declare resultTarget: HTMLPreElement;
  declare resultPanelTarget: HTMLDivElement;
  declare copyButtonTarget: HTMLButtonElement;
  declare saveButtonTarget: HTMLButtonElement;
  declare examplesTarget: HTMLSelectElement;
  declare inputAccordionTarget: HTMLDivElement;
  declare inputToggleTarget: HTMLButtonElement;
  declare inputBodyTarget: HTMLDivElement;
  declare settingsToggleTarget: HTMLButtonElement;
  declare settingsMenuTarget: HTMLDivElement;
  declare compiledAccordionTarget: HTMLElement;
  declare compiledToggleTarget: HTMLButtonElement;
  declare compiledBodyTarget: HTMLDivElement;

  private editorView: EditorView | null = null;
  private inputEditorView: EditorView | null = null;
  private themeObserver: MutationObserver | null = null;
  private compileVersion = 0;
  private currentOutput = ''; // Raw output for copy/save
  private runTimeout: number | null = null;

  connect() {
    this.initializeEditor();
    this.initializeInputEditor();

    // Watch for theme changes on body
    this.themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          this.reinitializeEditors();
        }
      }
    });
    this.themeObserver.observe(document.body, { attributes: true });

    // Check for code in URL parameters first, then localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    const inputFromUrl = urlParams.get('input');
    if (codeFromUrl) {
      this.setCode(codeFromUrl);
      if (inputFromUrl) {
        this.setInputData(inputFromUrl);
        // Auto-expand input accordion if input data was provided
        this.inputAccordionTarget.classList.add('open');
      }
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Load from localStorage if available
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        this.setCode(savedCode);
      }
    }

    // Keyboard shortcut: Ctrl+Enter to run
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Close settings menu when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this));

    // Compile and auto-run on initial load
    this.compile();
    this.scheduleAutoRun();

    // Auto-run if requested via URL
    if (urlParams.get('run') === '1' && codeFromUrl) {
      setTimeout(() => this.run(), 100);
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.run();
    }
  }

  private initializeEditor() {
    const initialCode = this.editorTarget.dataset.initialCode || '';
    const currentCode = this.editorView?.state.doc.toString() || initialCode;
    const isLight = document.body.classList.contains('light-theme');
    const theme = isLight ? eloLightTheme : eloDarkTheme;

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: currentCode,
        extensions: [
          lineNumbers(),
          history(),
          bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          elo(),
          ...theme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.compile();
            }
          }),
          EditorView.lineWrapping
        ]
      }),
      parent: this.editorTarget
    });
  }

  private initializeInputEditor() {
    const currentInput = this.inputEditorView?.state.doc.toString() || '';
    const isLight = document.body.classList.contains('light-theme');
    const theme = isLight ? eloLightTheme : eloDarkTheme;
    const inputFormat = this.inputFormatTarget?.value || 'json';

    // Build extensions - only include JSON mode for JSON format
    const extensions = [
      history(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...(inputFormat === 'json' ? [json()] : []),
      ...theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.scheduleAutoRun();
        }
      }),
      EditorView.lineWrapping
    ];

    this.inputEditorView = new EditorView({
      state: EditorState.create({
        doc: currentInput,
        extensions
      }),
      parent: this.inputEditorTarget
    });
  }

  private reinitializeInputEditor() {
    if (this.inputEditorView) {
      this.inputEditorView.destroy();
    }
    this.initializeInputEditor();
  }

  private reinitializeEditors() {
    if (this.editorView) {
      this.editorView.destroy();
    }
    this.reinitializeInputEditor();
    this.initializeEditor();
  }

  disconnect() {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    if (this.inputEditorView) {
      this.inputEditorView.destroy();
      this.inputEditorView = null;
    }
    if (this.runTimeout) {
      clearTimeout(this.runTimeout);
    }
  }

  toggleInput() {
    this.inputAccordionTarget.classList.toggle('open');
  }

  toggleCompiled() {
    this.compiledAccordionTarget.classList.toggle('open');
  }

  toggleSettings(event: Event) {
    event.stopPropagation();
    this.settingsMenuTarget.classList.toggle('visible');
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  private handleOutsideClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!this.settingsMenuTarget.contains(target) && !this.settingsToggleTarget.contains(target)) {
      this.settingsMenuTarget.classList.remove('visible');
    }
  }

  loadExample() {
    const exampleId = this.examplesTarget.value;
    if (exampleId && EXAMPLES[exampleId]) {
      this.setCode(EXAMPLES[exampleId]);
      // Set input data and format if example has one
      const exampleInput = EXAMPLE_INPUTS[exampleId];
      const hasInput = !!exampleInput;
      this.setInputData(exampleInput?.data || '');
      this.inputFormatTarget.value = exampleInput?.format || 'json';
      this.reinitializeInputEditor();
      // Auto-expand input accordion if example uses input data
      if (hasInput) {
        this.inputAccordionTarget.classList.add('open');
      }
      this.examplesTarget.value = ''; // Reset dropdown
    }
  }

  inputFormatChanged() {
    // Reinitialize input editor with appropriate language mode
    this.reinitializeInputEditor();
    this.scheduleAutoRun();
  }

  private scheduleAutoRun() {
    if (this.runTimeout) {
      clearTimeout(this.runTimeout);
    }
    // Only auto-run for JavaScript
    if (this.languageTarget.value === 'javascript') {
      this.runTimeout = window.setTimeout(() => this.run(), 300);
    }
  }

  private saveToLocalStorage() {
    const code = this.getCode();
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // localStorage might be unavailable
    }
  }

  getCode(): string {
    return this.editorView?.state.doc.toString() || '';
  }

  setCode(code: string) {
    if (this.editorView) {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: code }
      });
    }
  }

  getInputData(): string {
    return this.inputEditorView?.state.doc.toString() || '';
  }

  setInputData(data: string) {
    if (this.inputEditorView) {
      this.inputEditorView.dispatch({
        changes: { from: 0, to: this.inputEditorView.state.doc.length, insert: data }
      });
    }
  }

  async compile() {
    const version = ++this.compileVersion;
    const input = this.getCode();
    const language = this.languageTarget.value as TargetLanguage;
    const prettyPrint = this.prettyTarget.checked;
    const includePrelude = this.preludeTarget.checked;

    // Save to localStorage
    this.saveToLocalStorage();

    // Schedule auto-run
    this.scheduleAutoRun();

    if (!input.trim()) {
      this.outputTarget.textContent = '';
      this.currentOutput = '';
      this.hideError();
      this.hideResult();
      return;
    }

    try {
      const ast = parse(input);
      let output = this.compileToLanguage(ast, language);

      // Format the output (pretty print) if enabled
      const formattedOutput = prettyPrint ? await formatCode(output, language) : output;

      // Check if this compilation is still current (race condition handling)
      if (version !== this.compileVersion) return;

      // Build final output with optional prelude
      let finalOutput = formattedOutput;
      if (includePrelude) {
        const preludeTarget: PreludeTarget = language as PreludeTarget;
        const prelude = getPrelude(preludeTarget);
        if (prelude) {
          finalOutput = `${prelude}\n\n${formattedOutput}`;
        }
      }

      // Store raw output for copy/save
      this.currentOutput = finalOutput;

      // Apply syntax highlighting based on language
      this.outputTarget.innerHTML = this.highlightOutput(finalOutput, language);
      this.hideError();
    } catch (error) {
      if (version !== this.compileVersion) return;
      this.outputTarget.innerHTML = '';
      this.currentOutput = '';
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  run() {
    const input = this.getCode();

    if (!input.trim()) {
      return;
    }

    try {
      const ast = parse(input);
      const { code: jsCode } = compileToJavaScriptWithMeta(ast);

      // Parse input data if provided
      let inputData: unknown = null;
      const inputDataStr = this.getInputData().trim();
      if (inputDataStr) {
        const inputFormat = this.inputFormatTarget.value;
        try {
          inputData = getFormat(defaultFormats, inputFormat).parse(inputDataStr);
        } catch {
          this.showError(`Invalid ${inputFormat.toUpperCase()} in input data`);
          this.hideResult();
          return;
        }
      }

      // Evaluate the JavaScript code - always call the function with input data
      const fn = eval(jsCode);
      const result = fn(inputData);

      // Display the result
      this.showResult(this.formatResult(result));
      this.hideError();
    } catch (error) {
      this.hideResult();
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  async copy() {
    if (!this.currentOutput) return;

    try {
      await navigator.clipboard.writeText(this.currentOutput);
      // Brief visual feedback
      const btn = this.copyButtonTarget;
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1000);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = this.currentOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  save() {
    if (!this.currentOutput) return;

    const language = this.languageTarget.value as TargetLanguage;
    const extensions: Record<TargetLanguage, string> = {
      javascript: 'js',
      ruby: 'rb',
      sql: 'sql',
      python: 'py'
    };

    const blob = new Blob([this.currentOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elo-output.${extensions[language]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private formatResult(value: any): string {
    const format = this.outputFormatTarget.value;
    // Use pretty JSON for readability in playground
    if (format === 'json') {
      return JSON.stringify(value, null, 2);
    }
    return getFormat(defaultFormats, format).serialize(value);
  }

  private compileToLanguage(ast: ReturnType<typeof parse>, language: TargetLanguage): string {
    switch (language) {
      case 'ruby':
        return compileToRuby(ast);
      case 'javascript':
        return compileToJavaScript(ast);
      case 'sql':
        return compileToSQL(ast);
      case 'python':
        return compileToPython(ast);
      default:
        return '';
    }
  }

  private highlightOutput(code: string, language: TargetLanguage): string {
    switch (language) {
      case 'javascript':
        return highlightJS(code);
      case 'ruby':
        return highlightRuby(code);
      case 'sql':
        return highlightSQL(code);
      case 'python':
        return highlightPython(code);
      default:
        return code;
    }
  }

  private showResult(message: string) {
    this.resultTarget.textContent = message;
  }

  private hideResult() {
    this.resultTarget.textContent = '';
  }

  private showError(message: string) {
    this.errorTarget.textContent = message;
    this.errorTarget.classList.add('visible');
    this.errorTarget.closest('.flow-output')?.classList.add('has-error');
  }

  private hideError() {
    this.errorTarget.textContent = '';
    this.errorTarget.classList.remove('visible');
    this.errorTarget.closest('.flow-output')?.classList.remove('has-error');
  }
}
