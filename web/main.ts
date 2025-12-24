import { Application } from '@hotwired/stimulus';
import PlaygroundController from './controllers/playground_controller';
import TabsController from './controllers/tabs_controller';
import DocController from './controllers/doc_controller';

// Start Stimulus application
const application = Application.start();

// Register controllers
application.register('playground', PlaygroundController);
application.register('tabs', TabsController);
application.register('doc', DocController);
