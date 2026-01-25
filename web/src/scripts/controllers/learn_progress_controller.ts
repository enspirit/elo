import { Controller } from "@hotwired/stimulus";

const STORAGE_KEY = "elo-learn-progress";

interface LessonProgress {
  [lessonId: string]: boolean;
}

export default class LearnProgressController extends Controller {
  static targets = ["lesson", "tocLink", "toggleBtn"];

  declare lessonTargets: HTMLElement[];
  declare tocLinkTargets: HTMLElement[];
  declare toggleBtnTargets: HTMLElement[];

  private progress: LessonProgress = {};

  connect() {
    this.loadProgress();
    this.updateAllUI();
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

  toggle(event: Event) {
    const button = event.currentTarget as HTMLElement;
    const lessonId = button.dataset.lesson;
    if (!lessonId) return;

    const wasCompleted = this.progress[lessonId];
    this.progress[lessonId] = !wasCompleted;
    this.saveProgress();
    this.updateLessonUI(lessonId);

    // If just marked as complete, scroll to next lesson
    if (!wasCompleted) {
      this.scrollToNextLesson(lessonId);
    }
  }

  private scrollToNextLesson(currentLessonId: string) {
    const currentIndex = this.lessonTargets.findIndex(
      (el) => el.id === currentLessonId,
    );
    const nextLesson = this.lessonTargets[currentIndex + 1];
    if (nextLesson) {
      setTimeout(() => {
        nextLesson.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }

  private updateAllUI() {
    const lessonIds = this.lessonTargets.map((el) => el.id);
    lessonIds.forEach((id) => this.updateLessonUI(id));
  }

  private updateLessonUI(lessonId: string) {
    const isCompleted = !!this.progress[lessonId];

    // Update lesson section
    const lesson = this.lessonTargets.find((el) => el.id === lessonId);
    if (lesson) {
      lesson.classList.toggle("completed", isCompleted);
    }

    // Update toggle button
    const button = this.toggleBtnTargets.find(
      (el) => el.dataset.lesson === lessonId,
    );
    if (button) {
      button.classList.toggle("completed", isCompleted);
      const textSpan = button.querySelector(".toggle-text");
      if (textSpan) {
        textSpan.textContent = isCompleted ? "Completed" : "Mark as complete";
      }
    }

    // Update TOC link
    const tocLink = this.tocLinkTargets.find(
      (el) => el.getAttribute("href") === `#${lessonId}`,
    );
    if (tocLink) {
      tocLink.classList.toggle("completed", isCompleted);
    }
  }
}
