import { Controller } from '@hotwired/stimulus';
import type PlaygroundController from './playground_controller';

export default class DocController extends Controller {
  tryExample(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const codeElement = target.querySelector('.example-code') || target.querySelector('.comparison-code');

    if (!codeElement) return;

    const code = (codeElement.textContent || '').trim();

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

    // Get the playground controller and set the code
    const playgroundElement = document.querySelector('[data-controller="playground"]') as HTMLElement;
    if (playgroundElement) {
      // Access the Stimulus controller instance
      const app = (window as any).Stimulus || this.application;
      const playgroundController = app.getControllerForElementAndIdentifier(
        playgroundElement,
        'playground'
      ) as PlaygroundController;

      if (playgroundController && typeof playgroundController.setCode === 'function') {
        playgroundController.setCode(code);
        playgroundController.compile();

        // Click the Run button to execute the example
        const runButton = document.querySelector('[data-playground-target="runButton"]') as HTMLButtonElement;
        if (runButton) {
          setTimeout(() => runButton.click(), 50);
        }
      }
    }
  }
}
