import { Application } from '@hotwired/stimulus';
import PlaygroundController from './controllers/playground_controller';
import TabsController from './controllers/tabs_controller';
import DocController from './controllers/doc_controller';
import StdlibSearchController from './controllers/stdlib_search_controller';
import { highlightAll } from './highlighter';

// Start Stimulus application
const application = Application.start();

// Register controllers
application.register('playground', PlaygroundController);
application.register('tabs', TabsController);
application.register('doc', DocController);
application.register('stdlib-search', StdlibSearchController);

// Apply syntax highlighting to all Elo code examples
document.addEventListener('DOMContentLoaded', () => {
  highlightAll('.example-code');
});
