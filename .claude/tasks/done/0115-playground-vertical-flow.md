## Problem to solve

The playground screen was complex with a side-by-side layout that didn't clearly
communicate the data transformation flow. The input data section took up space
even when unused, and the relationship between code, compilation, and output
wasn't visually obvious.

## Idea

- Redesign as a vertical flow that shows the transformation pipeline:
  Input Data → Elo Program → Compiled → Output
- Collapse rarely-used sections (Input Data, Compiled) by default
- Make the primary workflow (write code, see output) more prominent
- Use visual connectors to reinforce the flow concept

## Solution Implemented

Complete vertical pipeline layout:

1. **Four stacked sections** with arrow connectors between them:
   - Input Data (collapsed by default, expands when loading examples that need it)
   - Elo Program (always visible, main focus, with line numbers)
   - Compiled (collapsed by default, with language selector, copy/save/settings)
   - Output (always visible, shows result or error)

2. **UX improvements**:
   - Removed Run button (auto-runs on code change via Ctrl+Enter)
   - Output format dropdown (Elo/JSON) instead of checkbox
   - Settings dropdown (gear icon) for Pretty/Prelude options
   - Entire Output block turns red on syntax errors
   - Wider layout (1200px max) with taller editors

3. **Visual design**:
   - Green-tinted Output section for success state
   - Red-tinted Output section for error state
   - Collapsible sections with rotating arrow indicators
   - Clean header layout with controls pushed to the right
