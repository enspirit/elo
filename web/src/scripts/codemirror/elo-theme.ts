/**
 * CodeMirror 6 themes matching Elo website
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Common editor styles
const commonStyles = {
  fontSize: "0.875rem",
  fontFamily: "'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
};

// Dark theme
export const eloDarkEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0f0f23",
      color: "#e4e4e7",
      ...commonStyles,
    },
    ".cm-content": {
      caretColor: "#6366f1",
      padding: "1rem",
    },
    ".cm-cursor": {
      borderLeftColor: "#6366f1",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(99, 102, 241, 0.3)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-gutters": {
      backgroundColor: "#0f0f23",
      color: "#a1a1aa",
      border: "none",
      paddingRight: "0.5rem",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: true },
);

// Light theme
export const eloLightEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#e2e8f0",
      color: "#1e293b",
      ...commonStyles,
    },
    ".cm-content": {
      caretColor: "#4f46e5",
      padding: "1rem",
    },
    ".cm-cursor": {
      borderLeftColor: "#4f46e5",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(79, 70, 229, 0.2)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(0, 0, 0, 0.03)",
    },
    ".cm-gutters": {
      backgroundColor: "#e2e8f0",
      color: "#64748b",
      border: "none",
      paddingRight: "0.5rem",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(0, 0, 0, 0.03)",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: false },
);

// Dark syntax highlighting
export const eloDarkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea", fontWeight: "500" },
  { tag: tags.atom, color: "#ff9cac" }, // booleans, dates
  { tag: tags.number, color: "#f78c6c" },
  { tag: tags.string, color: "#c3e88d" },
  { tag: tags.comment, color: "#546e7a", fontStyle: "italic" },
  { tag: tags.operator, color: "#89ddff" },
  { tag: tags.punctuation, color: "#a1a1aa" },
  { tag: tags.variableName, color: "#e4e4e7" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: tags.propertyName, color: "#f07178" },
]);

// Light syntax highlighting
export const eloLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "500" },
  { tag: tags.atom, color: "#db2777" }, // booleans, dates
  { tag: tags.number, color: "#ea580c" },
  { tag: tags.string, color: "#16a34a" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: tags.operator, color: "#0369a1" },
  { tag: tags.punctuation, color: "#64748b" },
  { tag: tags.variableName, color: "#1e293b" },
  { tag: tags.function(tags.variableName), color: "#2563eb" },
  { tag: tags.propertyName, color: "#dc2626" },
]);

// Combined themes
export const eloDarkTheme = [
  eloDarkEditorTheme,
  syntaxHighlighting(eloDarkHighlightStyle),
];
export const eloLightTheme = [
  eloLightEditorTheme,
  syntaxHighlighting(eloLightHighlightStyle),
];

// Legacy export for compatibility
export const eloEditorTheme = eloDarkEditorTheme;
export const eloHighlightStyle = eloDarkHighlightStyle;
export const eloTheme = eloDarkTheme;
