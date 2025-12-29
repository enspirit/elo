import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * This test ensures that website navigation menus stay consistent with
 * the actual sections in each page. When adding new language constructs,
 * the menus must be updated in multiple places:
 *
 * 1. Layout.astro - Header dropdown menus
 * 2. Page sidebar - Table of contents within each page
 * 3. Page body - Actual section IDs
 *
 * This test catches forgotten menu updates.
 */

// Use process.cwd() to get project root since tests run from dist/
const webDir = path.join(process.cwd(), 'web/src');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(webDir, relativePath), 'utf-8');
}

/**
 * Extract href="#id" links from a nav/menu section
 */
function extractHashLinks(content: string, startMarker: string, endMarker: string): string[] {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) return [];

  const section = content.slice(startIdx, endIdx);
  const matches = section.matchAll(/href=["']#([^"']+)["']/g);
  return Array.from(matches, m => m[1]);
}

/**
 * Extract href={url('/path#id')} links from Layout.astro dropdown
 */
function extractLayoutLinks(content: string, pagePath: string): string[] {
  const regex = new RegExp(`href=\\{url\\(['"]${pagePath}#([^'"]+)['"]\\)\\}`, 'g');
  const matches = content.matchAll(regex);
  return Array.from(matches, m => m[1]);
}

/**
 * Extract section IDs from page body
 */
function extractSectionIds(content: string, sectionClass: string): string[] {
  const regex = new RegExp(`<section[^>]*class=["'][^"']*${sectionClass}[^"']*["'][^>]*id=["']([^"']+)["']`, 'g');
  const matches = content.matchAll(regex);
  return Array.from(matches, m => m[1]);
}

describe('Website Menu Consistency', () => {

  describe('docs.astro', () => {
    const docsContent = readFile('pages/docs.astro');
    const layoutContent = readFile('layouts/Layout.astro');

    it('sidebar links should match section IDs in page body', () => {
      // Extract sidebar links from docs.astro
      const sidebarLinks = extractHashLinks(docsContent, '<aside class="doc-toc">', '</aside>');

      // Extract section IDs from page body
      const sectionIds = extractSectionIds(docsContent, 'doc-section');

      // Every sidebar link should have a corresponding section
      for (const link of sidebarLinks) {
        assert.ok(
          sectionIds.includes(link),
          `Sidebar link "#${link}" has no matching section in docs.astro body. ` +
          `Add <section class="doc-section" id="${link}"> or remove the link.`
        );
      }

      // Every section should have a sidebar link
      for (const id of sectionIds) {
        assert.ok(
          sidebarLinks.includes(id),
          `Section id="${id}" has no sidebar link in docs.astro. ` +
          `Add <a href="#${id}"> to the sidebar or remove the section.`
        );
      }
    });

    it('Layout.astro dropdown should match docs.astro sidebar', () => {
      // Extract Layout dropdown links for /docs
      const layoutLinks = extractLayoutLinks(layoutContent, '/docs');

      // Extract sidebar links from docs.astro
      const sidebarLinks = extractHashLinks(docsContent, '<aside class="doc-toc">', '</aside>');

      // Every Layout link should exist in sidebar
      for (const link of layoutLinks) {
        assert.ok(
          sidebarLinks.includes(link),
          `Layout.astro has link to "/docs#${link}" but docs.astro sidebar doesn't have "#${link}". ` +
          `Add it to docs.astro sidebar or remove from Layout.astro.`
        );
      }

      // Every sidebar link should exist in Layout (ensures Layout is complete)
      for (const link of sidebarLinks) {
        assert.ok(
          layoutLinks.includes(link),
          `docs.astro sidebar has "#${link}" but Layout.astro dropdown is missing "/docs#${link}". ` +
          `Add it to Layout.astro Reference submenu.`
        );
      }
    });
  });

  describe('stdlib.astro', () => {
    const stdlibContent = readFile('pages/stdlib.astro');
    const layoutContent = readFile('layouts/Layout.astro');

    it('sidebar links should match section IDs in page body', () => {
      // Extract sidebar links from stdlib.astro
      const sidebarLinks = extractHashLinks(stdlibContent, '<aside class="stdlib-toc">', '</aside>');

      // Extract section IDs from page body
      const sectionIds = extractSectionIds(stdlibContent, 'stdlib-section');

      // Every sidebar link should have a corresponding section
      for (const link of sidebarLinks) {
        assert.ok(
          sectionIds.includes(link),
          `Sidebar link "#${link}" has no matching section in stdlib.astro body. ` +
          `Add <section class="stdlib-section" id="${link}"> or remove the link.`
        );
      }

      // Every section should have a sidebar link
      for (const id of sectionIds) {
        assert.ok(
          sidebarLinks.includes(id),
          `Section id="${id}" has no sidebar link in stdlib.astro. ` +
          `Add <a href="#${id}"> to the sidebar or remove the section.`
        );
      }
    });

    it('Layout.astro dropdown should match stdlib.astro sidebar', () => {
      // Extract Layout dropdown links for /stdlib
      const layoutLinks = extractLayoutLinks(layoutContent, '/stdlib');

      // Extract sidebar links from stdlib.astro
      const sidebarLinks = extractHashLinks(stdlibContent, '<aside class="stdlib-toc">', '</aside>');

      // Every Layout link should exist in sidebar
      for (const link of layoutLinks) {
        assert.ok(
          sidebarLinks.includes(link),
          `Layout.astro has link to "/stdlib#${link}" but stdlib.astro sidebar doesn't have "#${link}". ` +
          `Add it to stdlib.astro sidebar or remove from Layout.astro.`
        );
      }

      // Every sidebar link should exist in Layout
      for (const link of sidebarLinks) {
        assert.ok(
          layoutLinks.includes(link),
          `stdlib.astro sidebar has "#${link}" but Layout.astro dropdown is missing "/stdlib#${link}". ` +
          `Add it to Layout.astro Stdlib submenu.`
        );
      }
    });
  });
});
