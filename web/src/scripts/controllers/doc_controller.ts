import { Controller } from "@hotwired/stimulus";

// Get base URL at build time
const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export default class DocController extends Controller {
  tryExample(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const codeElement =
      target.querySelector('[class*="language-"]') ||
      target.querySelector(".comparison-code");

    if (!codeElement) return;

    const code = (codeElement.textContent || "").trim();
    const inputData = target.dataset.input;

    // Navigate to playground with code (and optionally input) as URL parameters
    const encodedCode = encodeURIComponent(code);
    let url = `${BASE_URL}/try?code=${encodedCode}&run=1`;
    if (inputData) {
      url += `&input=${encodeURIComponent(inputData)}`;
    }
    window.location.href = url;
  }
}
