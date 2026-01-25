import { describe, it } from "bun:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

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
const webDir = path.join(process.cwd(), "web/src");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(webDir, relativePath), "utf-8");
}

/**
 * Extract href="#id" links from a nav/menu section
 */
function extractHashLinks(
  content: string,
  startMarker: string,
  endMarker: string,
): string[] {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) return [];

  const section = content.slice(startIdx, endIdx);
  const matches = section.matchAll(/href=["']#([^"']+)["']/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Extract href={url('/path#id')} links from Layout.astro dropdown
 */
function extractLayoutLinks(content: string, pagePath: string): string[] {
  const regex = new RegExp(
    `href=\\{url\\(['"]${pagePath}#([^'"]+)['"]\\)\\}`,
    "g",
  );
  const matches = content.matchAll(regex);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Extract section IDs from page body
 */
function extractSectionIds(content: string, sectionClass: string): string[] {
  const regex = new RegExp(
    `<section[^>]*class=["'][^"']*${sectionClass}[^"']*["'][^>]*id=["']([^"']+)["']`,
    "g",
  );
  const matches = content.matchAll(regex);
  return Array.from(matches, (m) => m[1]);
}

describe("Website Menu Consistency", () => {
  describe("reference.astro", () => {
    const referenceContent = readFile("pages/reference.astro");
    const layoutContent = readFile("layouts/Layout.astro");

    it("sidebar links should match section IDs in page body", () => {
      // Extract sidebar links from reference.astro
      const sidebarLinks = extractHashLinks(
        referenceContent,
        '<aside class="doc-toc">',
        "</aside>",
      );

      // Extract section IDs from page body
      const sectionIds = extractSectionIds(referenceContent, "doc-section");

      // Every sidebar link should have a corresponding section
      for (const link of sidebarLinks) {
        assert.ok(
          sectionIds.includes(link),
          `Sidebar link "#${link}" has no matching section in reference.astro body. ` +
            `Add <section class="doc-section" id="${link}"> or remove the link.`,
        );
      }

      // Every section should have a sidebar link
      for (const id of sectionIds) {
        assert.ok(
          sidebarLinks.includes(id),
          `Section id="${id}" has no sidebar link in reference.astro. ` +
            `Add <a href="#${id}"> to the sidebar or remove the section.`,
        );
      }
    });

    it("Layout.astro dropdown should match reference.astro sidebar", () => {
      // Extract Layout dropdown links for /reference
      const layoutLinks = extractLayoutLinks(layoutContent, "/reference");

      // Extract sidebar links from reference.astro
      const sidebarLinks = extractHashLinks(
        referenceContent,
        '<aside class="doc-toc">',
        "</aside>",
      );

      // Every Layout link should exist in sidebar
      for (const link of layoutLinks) {
        assert.ok(
          sidebarLinks.includes(link),
          `Layout.astro has link to "/reference#${link}" but reference.astro sidebar doesn't have "#${link}". ` +
            `Add it to reference.astro sidebar or remove from Layout.astro.`,
        );
      }

      // Every sidebar link should exist in Layout (ensures Layout is complete)
      for (const link of sidebarLinks) {
        assert.ok(
          layoutLinks.includes(link),
          `reference.astro sidebar has "#${link}" but Layout.astro dropdown is missing "/reference#${link}". ` +
            `Add it to Layout.astro Reference submenu.`,
        );
      }
    });
  });

  describe("stdlib.astro", () => {
    const stdlibContent = readFile("pages/stdlib.astro");
    const layoutContent = readFile("layouts/Layout.astro");

    it("sidebar links should match section IDs in page body", () => {
      // Extract sidebar links from stdlib.astro
      const sidebarLinks = extractHashLinks(
        stdlibContent,
        '<aside class="stdlib-toc">',
        "</aside>",
      );

      // Extract section IDs from page body
      const sectionIds = extractSectionIds(stdlibContent, "stdlib-section");

      // Every sidebar link should have a corresponding section
      for (const link of sidebarLinks) {
        assert.ok(
          sectionIds.includes(link),
          `Sidebar link "#${link}" has no matching section in stdlib.astro body. ` +
            `Add <section class="stdlib-section" id="${link}"> or remove the link.`,
        );
      }

      // Every section should have a sidebar link
      for (const id of sectionIds) {
        assert.ok(
          sidebarLinks.includes(id),
          `Section id="${id}" has no sidebar link in stdlib.astro. ` +
            `Add <a href="#${id}"> to the sidebar or remove the section.`,
        );
      }
    });

    it("Layout.astro dropdown should match stdlib.astro sidebar", () => {
      // Extract Layout dropdown links for /stdlib
      const layoutLinks = extractLayoutLinks(layoutContent, "/stdlib");

      // Extract sidebar links from stdlib.astro
      const sidebarLinks = extractHashLinks(
        stdlibContent,
        '<aside class="stdlib-toc">',
        "</aside>",
      );

      // Every Layout link should exist in sidebar
      for (const link of layoutLinks) {
        assert.ok(
          sidebarLinks.includes(link),
          `Layout.astro has link to "/stdlib#${link}" but stdlib.astro sidebar doesn't have "#${link}". ` +
            `Add it to stdlib.astro sidebar or remove from Layout.astro.`,
        );
      }

      // Every sidebar link should exist in Layout
      for (const link of sidebarLinks) {
        assert.ok(
          layoutLinks.includes(link),
          `stdlib.astro sidebar has "#${link}" but Layout.astro dropdown is missing "/stdlib#${link}". ` +
            `Add it to Layout.astro Stdlib submenu.`,
        );
      }
    });
  });

  describe("learn.astro", () => {
    const learnContent = readFile("pages/learn.astro");
    const layoutContent = readFile("layouts/Layout.astro");

    /**
     * Extract lesson and exercise IDs from learn.astro body
     */
    function extractLearnSectionIds(content: string): string[] {
      // Match lesson sections: <section class="lesson" id="chapter-1">
      const lessonRegex =
        /<section[^>]*class=["'][^"']*lesson[^"']*["'][^>]*id=["']([^"']+)["']/g;
      const lessonMatches = content.matchAll(lessonRegex);
      const lessonIds = Array.from(lessonMatches, (m) => m[1]);

      // Match exercise sections: <section class="exercise" id="ex-greeting">
      const exerciseRegex =
        /<section[^>]*class=["'][^"']*exercise[^"']*["'][^>]*id=["']([^"']+)["']/g;
      const exerciseMatches = content.matchAll(exerciseRegex);
      const exerciseIds = Array.from(exerciseMatches, (m) => m[1]);

      return [...lessonIds, ...exerciseIds];
    }

    it("sidebar links should match section IDs in page body", () => {
      // Extract sidebar links from learn.astro
      const sidebarLinks = extractHashLinks(
        learnContent,
        '<aside class="learn-toc">',
        "</aside>",
      );

      // Extract section IDs from page body (lessons and exercises)
      const sectionIds = extractLearnSectionIds(learnContent);

      // Every sidebar link should have a corresponding section (excluding chapter-next which is special)
      for (const link of sidebarLinks) {
        if (link === "chapter-next") continue; // This is a special "What's Next" section, not a lesson
        assert.ok(
          sectionIds.includes(link),
          `Sidebar link "#${link}" has no matching section in learn.astro body. ` +
            `Add <section class="lesson" id="${link}"> or <section class="exercise" id="${link}"> or remove the link.`,
        );
      }

      // Every section should have a sidebar link (excluding special sections)
      const specialSections = ["chapter-next", "exercises-intro"];
      for (const id of sectionIds) {
        if (specialSections.includes(id)) continue;
        assert.ok(
          sidebarLinks.includes(id),
          `Section id="${id}" has no sidebar link in learn.astro. ` +
            `Add <a href="#${id}"> to the sidebar or remove the section.`,
        );
      }
    });

    it("Layout.astro dropdown should match learn.astro sidebar", () => {
      // Extract Layout dropdown links for /learn
      const layoutLinks = extractLayoutLinks(layoutContent, "/learn");

      // Extract sidebar links from learn.astro (excluding chapter-next)
      const sidebarLinks = extractHashLinks(
        learnContent,
        '<aside class="learn-toc">',
        "</aside>",
      ).filter((link) => link !== "chapter-next");

      // Every Layout link should exist in sidebar
      for (const link of layoutLinks) {
        assert.ok(
          sidebarLinks.includes(link),
          `Layout.astro has link to "/learn#${link}" but learn.astro sidebar doesn't have "#${link}". ` +
            `Add it to learn.astro sidebar or remove from Layout.astro.`,
        );
      }

      // Every sidebar link should exist in Layout (ensures Layout is complete)
      for (const link of sidebarLinks) {
        assert.ok(
          layoutLinks.includes(link),
          `learn.astro sidebar has "#${link}" but Layout.astro dropdown is missing "/learn#${link}". ` +
            `Add it to Layout.astro Learn submenu.`,
        );
      }
    });
  });
});
