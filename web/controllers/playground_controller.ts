import { Controller } from '@hotwired/stimulus';
import { parse, compileToRuby, compileToJavaScript, compileToSQL } from '../../src/index';

type TargetLanguage = 'ruby' | 'javascript' | 'sql';

export default class PlaygroundController extends Controller {
  static targets = ['input', 'output', 'language', 'error'];

  declare inputTarget: HTMLTextAreaElement;
  declare outputTarget: HTMLPreElement;
  declare languageTarget: HTMLSelectElement;
  declare errorTarget: HTMLDivElement;

  connect() {
    // Compile on initial load
    this.compile();
  }

  compile() {
    const input = this.inputTarget.value;
    const language = this.languageTarget.value as TargetLanguage;

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

  private showError(message: string) {
    this.errorTarget.textContent = message;
    this.errorTarget.classList.add('visible');
  }

  private hideError() {
    this.errorTarget.textContent = '';
    this.errorTarget.classList.remove('visible');
  }
}
