/**
 * CodeMirror 6 dark theme matching Elo website
 */
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Base editor theme
export const eloEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    fontSize: '0.875rem',
    fontFamily: "'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace"
  },
  '.cm-content': {
    caretColor: '#6366f1',
    padding: '1rem'
  },
  '.cm-cursor': {
    borderLeftColor: '#6366f1'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(99, 102, 241, 0.3)'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  '.cm-gutters': {
    backgroundColor: '#0f0f23',
    color: '#a1a1aa',
    border: 'none',
    paddingRight: '0.5rem'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  '.cm-scroller': {
    overflow: 'auto'
  }
}, { dark: true });

// Syntax highlighting matching our CSS colors
export const eloHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c792ea', fontWeight: '500' },
  { tag: tags.atom, color: '#ff9cac' },  // booleans, dates
  { tag: tags.number, color: '#f78c6c' },
  { tag: tags.string, color: '#c3e88d' },
  { tag: tags.comment, color: '#546e7a', fontStyle: 'italic' },
  { tag: tags.operator, color: '#89ddff' },
  { tag: tags.punctuation, color: '#a1a1aa' },
  { tag: tags.variableName, color: '#e4e4e7' },
  { tag: tags.function(tags.variableName), color: '#82aaff' },
  { tag: tags.propertyName, color: '#f07178' }
]);

export const eloTheme = [eloEditorTheme, syntaxHighlighting(eloHighlightStyle)];
