import { Controller } from '@hotwired/stimulus';

export default class TabsController extends Controller {
  static targets = ['tab', 'panel'];

  declare tabTargets: HTMLAnchorElement[];
  declare panelTargets: HTMLElement[];

  switch(event: Event) {
    event.preventDefault();
    const target = event.currentTarget as HTMLAnchorElement;
    const tabName = target.dataset.tab;

    // Update tab active states
    this.tabTargets.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Show/hide panels
    this.panelTargets.forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.panel !== tabName);
    });
  }
}
