## Problem to solve

The website is implemented in one single index.html file (2100+ lines, 107KB). It's too big
for Claude Code to read and maintain. We need to migrate to Astro for component-based
structure while keeping Stimulus for interactivity.

## Solution

Migrate to Astro static site generator while:

- Keeping all Stimulus controllers unchanged
- Splitting content into pages and components
- Maintaining GitHub Pages deployment

## Implementation Plan

### Phase 1: Astro Setup

1. Initialize Astro in `web/` directory:

   ```bash
   cd web && npm create astro@latest . -- --template minimal
   ```

2. Configure `astro.config.mjs`:

   ```js
   import { defineConfig } from "astro/config";
   export default defineConfig({
     site: "https://elo-lang.org",
     base: "/",
     output: "static",
   });
   ```

3. Update `web/package.json` with Astro scripts:
   - `dev`: `astro dev`
   - `build`: `astro build`
   - `preview`: `astro preview`

### Phase 2: Layout & Structure

4. Create base layout `src/layouts/Layout.astro`:
   - HTML head (meta, styles)
   - Navigation header
   - Theme toggle
   - Footer
   - Stimulus initialization script

5. Create page structure:
   ```
   web/
   ├── src/
   │   ├── layouts/
   │   │   └── Layout.astro
   │   ├── components/
   │   │   ├── Header.astro
   │   │   ├── Footer.astro
   │   │   ├── ThemeToggle.astro
   │   │   ├── Playground.astro
   │   │   ├── Example.astro
   │   │   └── Lesson.astro
   │   ├── pages/
   │   │   ├── index.astro        (home + hero)
   │   │   ├── learn.astro        (all lessons)
   │   │   ├── docs.astro         (language reference)
   │   │   ├── stdlib.astro       (function reference)
   │   │   └── playground.astro   (try panel)
   │   ├── content/
   │   │   ├── lessons/           (markdown files for Learn)
   │   │   └── docs/              (markdown files for Docs)
   │   └── scripts/
   │       ├── main.ts            (Stimulus setup)
   │       └── controllers/       (moved from web/controllers/)
   ├── public/
   │   └── (static assets)
   └── astro.config.mjs
   ```

### Phase 3: Migrate Content

6. Extract content from index.html into:
   - `src/content/lessons/*.md` - Learn section (lessons 1-9)
   - `src/content/docs/*.md` - Doc section
   - `src/components/*.astro` - Reusable UI pieces

7. Keep Stimulus controllers as-is in `src/scripts/controllers/`

8. Create `src/scripts/main.ts`:
   ```typescript
   import { Application } from "@hotwired/stimulus";
   import PlaygroundController from "./controllers/playground_controller";
   import TabsController from "./controllers/tabs_controller";
   import DocController from "./controllers/doc_controller";
   import StdlibSearchController from "./controllers/stdlib_search_controller";
   // ... same as current main.ts
   ```

### Phase 4: Styles

9. Move `styles.css` to `src/styles/global.css`
10. Import in Layout.astro

### Phase 5: Update GitHub Actions

11. Update `.github/workflows/deploy-pages.yml`:

    ```yaml
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: "20"
              cache: "npm"

          - name: Install root dependencies
            run: npm ci

          - name: Install web dependencies
            run: cd web && npm ci

          - name: Build Astro site
            run: cd web && npm run build

          - name: Setup Pages
            uses: actions/configure-pages@v4

          - name: Upload artifact
            uses: actions/upload-pages-artifact@v3
            with:
              path: ./web/dist

      deploy:
        # ... same as before
    ```

### Phase 6: Update Root package.json

12. Update scripts in root `package.json`:
    ```json
    {
      "scripts": {
        "build:web": "cd web && npm run build",
        "dev:web": "cd web && npm run dev"
      }
    }
    ```

### Phase 7: Cleanup

13. Remove old files:
    - `web/index.html`
    - `web/main.ts`
    - `web/controllers/` (moved to src/)
    - `web/highlighter.ts` (moved to src/)

14. Update `.gitignore` for Astro:
    ```
    web/node_modules/
    web/dist/
    web/.astro/
    ```

## Navigation Changes

Current single-page with hash routing (`#learn`, `#doc`, `#stdlib`, `#try`) becomes:

- `/` - Home with hero
- `/learn` - Learn section (or `/learn/lesson-1`, etc.)
- `/docs` - Language reference
- `/stdlib` - Function reference
- `/playground` - Interactive playground

The tabs controller will be simplified or removed since navigation becomes page-based.

## Testing Checklist

- [ ] Home page loads correctly
- [ ] All lessons render with examples
- [ ] Playground compiles Elo code
- [ ] Syntax highlighting works
- [ ] Theme toggle persists
- [ ] All stdlib functions documented
- [ ] GitHub Pages deployment succeeds
- [ ] URLs work with direct access (not just navigation)

## Dependencies

- Astro ^4.x
- @hotwired/stimulus (existing)
- Keep existing: dayjs, codemirror

## Risks

- Playground state between page navigations (may need ViewTransitions or keep as modal)
- SEO: will improve with proper pages
- Bundle size: Astro is efficient, should be similar or smaller
