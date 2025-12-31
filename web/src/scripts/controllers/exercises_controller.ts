import { Controller } from '@hotwired/stimulus';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import {
  parse,
  compileToJavaScript,
} from '@enspirit/elo';
import { elo } from '../codemirror/elo-language';
import { eloDarkTheme, eloLightTheme } from '../codemirror/elo-theme';

// Enable dayjs plugins
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);

// Make dayjs available globally for eval
(window as any).dayjs = dayjs;

const STORAGE_KEY = 'elo-exercises-progress';

interface ExerciseProgress {
  [exerciseId: string]: boolean;
}

export default class ExercisesController extends Controller {
  static targets = ['exercise', 'editor', 'feedback', 'checkButton', 'solutionButton', 'solution', 'tocLink'];

  declare exerciseTargets: HTMLElement[];
  declare editorTargets: HTMLElement[];
  declare feedbackTargets: HTMLElement[];
  declare checkButtonTargets: HTMLButtonElement[];
  declare solutionButtonTargets: HTMLButtonElement[];
  declare solutionTargets: HTMLElement[];
  declare tocLinkTargets: HTMLElement[];

  private editors: Map<string, EditorView> = new Map();
  private progress: ExerciseProgress = {};
  private themeObserver: MutationObserver | null = null;

  connect() {
    this.loadProgress();
    this.initializeEditors();
    this.updateAllUI();

    // Watch for theme changes
    this.themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          this.reinitializeEditors();
        }
      }
    });
    this.themeObserver.observe(document.body, { attributes: true });
  }

  disconnect() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    this.editors.forEach(editor => editor.destroy());
    this.editors.clear();
  }

  private loadProgress() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.progress = JSON.parse(stored);
      }
    } catch {
      this.progress = {};
    }
  }

  private saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // localStorage might be unavailable
    }
  }

  private initializeEditors() {
    this.editorTargets.forEach((editorEl) => {
      const exerciseId = editorEl.dataset.exerciseId;
      if (!exerciseId) return;

      const initialCode = editorEl.dataset.initialCode || '';
      this.createEditor(editorEl, exerciseId, initialCode);
    });
  }

  private createEditor(container: HTMLElement, exerciseId: string, initialCode: string) {
    const isLight = document.body.classList.contains('light-theme');
    const theme = isLight ? eloLightTheme : eloDarkTheme;

    const editor = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          history(),
          bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          elo(),
          ...theme,
          EditorView.lineWrapping
        ]
      }),
      parent: container
    });

    this.editors.set(exerciseId, editor);
  }

  private reinitializeEditors() {
    // Store current code
    const codeState = new Map<string, string>();
    this.editors.forEach((editor, id) => {
      codeState.set(id, editor.state.doc.toString());
    });

    // Destroy all editors
    this.editors.forEach(editor => editor.destroy());
    this.editors.clear();

    // Reinitialize with saved code
    this.editorTargets.forEach((editorEl) => {
      const exerciseId = editorEl.dataset.exerciseId;
      if (!exerciseId) return;

      editorEl.innerHTML = '';
      const code = codeState.get(exerciseId) || editorEl.dataset.initialCode || '';
      this.createEditor(editorEl, exerciseId, code);
    });
  }

  check(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const exerciseId = button.dataset.exerciseId;
    if (!exerciseId) return;

    const editor = this.editors.get(exerciseId);
    if (!editor) return;

    const code = editor.state.doc.toString();
    const feedback = this.feedbackTargets.find(el => el.dataset.exerciseId === exerciseId);
    if (!feedback) return;

    try {
      const ast = parse(code);
      const jsCode = compileToJavaScript(ast);
      const result = eval(jsCode);

      // All assertions passed if we get here without exception and result is true
      if (result === true) {
        feedback.textContent = 'All assertions passed!';
        feedback.className = 'exercise-feedback success';
        this.markCompleted(exerciseId);
      } else {
        feedback.textContent = `Result: ${this.formatResult(result)} - Expected all assertions to pass (return true)`;
        feedback.className = 'exercise-feedback error';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Check if it's an assertion failure
      if (message.includes('Assertion failed')) {
        feedback.textContent = message;
      } else {
        feedback.textContent = `Error: ${message}`;
      }
      feedback.className = 'exercise-feedback error';
    }
  }

  private formatResult(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value && typeof value === 'object' && value.$d instanceof Date) {
      return value.format();
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private markCompleted(exerciseId: string) {
    this.progress[exerciseId] = true;
    this.saveProgress();
    this.updateExerciseUI(exerciseId);
  }

  toggleSolution(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const exerciseId = button.dataset.exerciseId;
    if (!exerciseId) return;

    const solution = this.solutionTargets.find(el => el.dataset.exerciseId === exerciseId);
    if (!solution) return;

    const isHidden = solution.classList.contains('hidden');
    solution.classList.toggle('hidden', !isHidden);
    button.textContent = isHidden ? 'Hide Solution' : 'Show Solution';
  }

  private updateAllUI() {
    this.exerciseTargets.forEach(exercise => {
      const exerciseId = exercise.id;
      if (exerciseId) {
        this.updateExerciseUI(exerciseId);
      }
    });
  }

  private updateExerciseUI(exerciseId: string) {
    const isCompleted = !!this.progress[exerciseId];

    // Update exercise section
    const exercise = this.exerciseTargets.find(el => el.id === exerciseId);
    if (exercise) {
      exercise.classList.toggle('completed', isCompleted);
    }

    // Update TOC link
    const tocLink = this.tocLinkTargets.find(el => el.getAttribute('href') === `#${exerciseId}`);
    if (tocLink) {
      tocLink.classList.toggle('completed', isCompleted);
    }
  }
}
