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

    // Set the code in the playground
    const playgroundInput = document.querySelector('[data-playground-target="input"]') as HTMLTextAreaElement;
    if (playgroundInput) {
      playgroundInput.value = code;
      // Trigger the compile action
      playgroundInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
