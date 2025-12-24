import { Controller } from '@hotwired/stimulus';
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from '../../src/index';

type TargetLanguage = 'ruby' | 'javascript' | 'sql';

// Duration class for JavaScript runtime support
class Duration {
  milliseconds: number;

  constructor(milliseconds: number) {
    this.milliseconds = milliseconds;
  }

  static parse(iso8601: string): Duration {
    const regex = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const match = iso8601.match(regex);

    if (!match) {
      throw new Error(`Invalid ISO 8601 duration: ${iso8601}`);
    }

    const [, years, months, days, hours, minutes, seconds] = match;

    let ms = 0;
    if (years) ms += parseInt(years) * 365.25 * 24 * 60 * 60 * 1000;
    if (months) ms += parseInt(months) * 30 * 24 * 60 * 60 * 1000;
    if (days) ms += parseInt(days) * 24 * 60 * 60 * 1000;
    if (hours) ms += parseInt(hours) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes) * 60 * 1000;
    if (seconds) ms += parseFloat(seconds) * 1000;

    return new Duration(ms);
  }

  addTo(date: Date): Date {
    return new Date(date.getTime() + this.milliseconds);
  }

  subtractFrom(date: Date): Date {
    return new Date(date.getTime() - this.milliseconds);
  }
}

// Make Duration available globally for eval
(window as any).Duration = Duration;

export default class PlaygroundController extends Controller {
  static targets = ['input', 'output', 'language', 'error', 'result', 'runButton'];

  declare inputTarget: HTMLTextAreaElement;
  declare outputTarget: HTMLPreElement;
  declare languageTarget: HTMLSelectElement;
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
      const output = this.compileToLanguage(ast, language);
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
