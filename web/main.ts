import { Application } from '@hotwired/stimulus';
import PlaygroundController from './controllers/playground_controller';

// Start Stimulus application
const application = Application.start();

// Register controllers
application.register('playground', PlaygroundController);
