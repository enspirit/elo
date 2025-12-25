import { Controller } from '@hotwired/stimulus';
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

// Enable dayjs plugins
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);

// Make dayjs available globally for eval (used by compiled IIFE helpers)
(window as any).dayjs = dayjs;

type TargetLanguage = 'ruby' | 'javascript' | 'sql';

export default class PlaygroundController extends Controller {
  static targets = ['input', 'output', 'language', 'prelude', 'error', 'result', 'runButton'];

  declare inputTarget: HTMLTextAreaElement;
  declare outputTarget: HTMLPreElement;
  declare languageTarget: HTMLSelectElement;
  declare preludeTarget: HTMLInputElement;
  declare errorTarget: HTMLDivElement;
  declare resultTarget: HTMLDivElement;
  declare runButtonTarget: HTMLButtonElement;

  connect() {
    // Compile on initial load
    this.compile();
  }

  compile() {
    const input = this.inputTarget.value;
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

      this.outputTarget.textContent = output;
      this.hideError();
    } catch (error) {
      this.outputTarget.textContent = '';
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  run() {
    const input = this.inputTarget.value;

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
