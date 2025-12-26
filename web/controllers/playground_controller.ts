import { Controller } from '@hotwired/stimulus';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import {
  parse,
  compileToRuby,
  compileToJavaScript,
  compileToSQL
} from '../../src/index';
import { getPrelude, Target as PreludeTarget } from '../../src/preludes';
import { elo } from '../codemirror/elo-language';
import { eloTheme } from '../codemirror/elo-theme';
import { highlightJS, highlightRuby, highlightSQL } from '../highlighter';

// Enable dayjs plugins
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);

// Make dayjs available globally for eval (used by compiled IIFE helpers)
(window as any).dayjs = dayjs;

type TargetLanguage = 'ruby' | 'javascript' | 'sql';

export default class PlaygroundController extends Controller {
  static targets = ['editor', 'output', 'language', 'prelude', 'error', 'result', 'runButton'];

  declare editorTarget: HTMLDivElement;
  declare outputTarget: HTMLPreElement;
  declare languageTarget: HTMLSelectElement;
  declare preludeTarget: HTMLInputElement;
  declare errorTarget: HTMLDivElement;
  declare resultTarget: HTMLDivElement;
  declare runButtonTarget: HTMLButtonElement;

  private editorView: EditorView | null = null;

  connect() {
    // Initialize CodeMirror
    const initialCode = this.editorTarget.dataset.initialCode || '';

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          history(),
          bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          elo(),
          ...eloTheme,
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

    // Compile on initial load
    this.compile();
  }

  disconnect() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
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

  compile() {
    const input = this.getCode();
    const language = this.languageTarget.value as TargetLanguage;
    const includePrelude = this.preludeTarget.checked;

    // Hide result when code changes
    this.hideResult();

    // Enable/disable run button based on language
    this.runButtonTarget.disabled = language !== 'javascript';

    if (!input.trim()) {
      this.outputTarget.textContent = '';
      this.hideError();
      return;
    }

    try {
      const ast = parse(input);
      let output = this.compileToLanguage(ast, language);

      if (includePrelude) {
        const preludeTarget: PreludeTarget = language === 'javascript' ? 'javascript' : language as PreludeTarget;
        const prelude = getPrelude(preludeTarget);
        if (prelude) {
          output = `${prelude}\n\n${output}`;
        }
      }

      // Apply syntax highlighting based on language
      this.outputTarget.innerHTML = this.highlightOutput(output, language);
      this.hideError();
    } catch (error) {
      this.outputTarget.innerHTML = '';
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
      const jsCode = compileToJavaScript(ast);

      // Evaluate the JavaScript code
      const result = eval(jsCode);

      // Display the result
      this.showResult(this.formatResult(result));
      this.hideError();
    } catch (error) {
      this.hideResult();
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  private formatResult(value: any): string {
    if (value === undefined) {
      return 'undefined';
    }
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    // Handle dayjs objects
    if (value && typeof value === 'object' && value.$d instanceof Date) {
      return value.format();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  private compileToLanguage(ast: ReturnType<typeof parse>, language: TargetLanguage): string {
    switch (language) {
      case 'ruby':
        return compileToRuby(ast);
      case 'javascript':
        return compileToJavaScript(ast);
      case 'sql':
        return compileToSQL(ast);
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
      default:
        return code;
    }
  }

  private showResult(message: string) {
    this.resultTarget.textContent = `Result: ${message}`;
    this.resultTarget.classList.add('visible');
  }

  private hideResult() {
    this.resultTarget.textContent = '';
    this.resultTarget.classList.remove('visible');
  }

  private showError(message: string) {
    this.errorTarget.textContent = message;
    this.errorTarget.classList.add('visible');
  }

  private hideError() {
    this.errorTarget.textContent = '';
    this.errorTarget.classList.remove('visible');
  }
}
