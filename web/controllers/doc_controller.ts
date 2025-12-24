import { Controller } from '@hotwired/stimulus';

export default class DocController extends Controller {
  tryExample(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const codeElement = target.querySelector('.example-code');

    if (!codeElement) return;

    const code = codeElement.textContent || '';

    // Switch to the Try tab
    const tryTab = document.querySelector('[data-tab="try"]') as HTMLAnchorElement;
    if (tryTab) {
      tryTab.click();
    }

    // Set JavaScript as the target language
    const languageSelect = document.querySelector('[data-playground-target="language"]') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.value = 'javascript';
    }

    // Set the code in the playground
    const playgroundInput = document.querySelector('[data-playground-target="input"]') as HTMLTextAreaElement;
    if (playgroundInput) {
      playgroundInput.value = code;
      // Trigger the compile action
      playgroundInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Click the Run button to execute the example
    const runButton = document.querySelector('[data-playground-target="runButton"]') as HTMLButtonElement;
    if (runButton) {
      // Small delay to ensure compile happens first
      setTimeout(() => runButton.click(), 50);
    }
  }
}
