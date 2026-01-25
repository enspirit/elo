/**
 * Dynamic code formatters for the playground
 *
 * Uses dynamic imports from CDN to avoid bloating the bundle.
 * Formatters are loaded on-demand and cached.
 */

// Cache for loaded formatters
let prettierModule: any = null;
let prettierJSPlugins: any[] = [];
let sqlFormatterModule: any = null;

/**
 * Load Prettier from CDN (for JavaScript formatting)
 */
async function loadPrettierJS(): Promise<void> {
  if (prettierModule && prettierJSPlugins.length > 0) return;

  // Load Prettier standalone and required plugins in parallel
  const [prettier, babelPlugin, estreePlugin] = await Promise.all([
    import("https://esm.sh/prettier@3.4.2/standalone"),
    import("https://esm.sh/prettier@3.4.2/plugins/babel"),
    import("https://esm.sh/prettier@3.4.2/plugins/estree"),
  ]);

  prettierModule = prettier;
  prettierJSPlugins = [babelPlugin, estreePlugin];
}

/**
 * Load sql-formatter from CDN
 */
async function loadSqlFormatter(): Promise<void> {
  if (sqlFormatterModule) return;
  sqlFormatterModule = await import("https://esm.sh/sql-formatter@15.4.10");
}

/**
 * Format JavaScript code using Prettier
 */
export async function formatJS(code: string): Promise<string> {
  try {
    await loadPrettierJS();
    const result = await prettierModule.format(code, {
      parser: "babel",
      plugins: prettierJSPlugins,
      printWidth: 60,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
    });
    // Remove trailing newline that Prettier adds
    return result.trimEnd();
  } catch {
    // Return original code if formatting fails
    return code;
  }
}

/**
 * Format SQL code using sql-formatter
 */
export async function formatSQL(code: string): Promise<string> {
  try {
    await loadSqlFormatter();
    return sqlFormatterModule.format(code, {
      language: "postgresql",
      tabWidth: 2,
      keywordCase: "upper",
    });
  } catch {
    // Return original code if formatting fails
    return code;
  }
}

/**
 * Format Ruby code with simple indentation
 *
 * No browser-compatible Ruby formatter exists, so we do basic formatting
 * for arrow lambdas: ->(x) { body }.call(...)
 */
export function formatRuby(code: string): string {
  // Insert newline after { in arrow lambdas
  let result = code.replace(/(->\([^)]*\)\s*\{)\s*/g, "$1\n");

  // Insert newline before } (with optional .call)
  result = result.replace(/\s*\}(\.call\(|$)/g, "\n}$1");

  // Apply indentation
  const lines = result.split("\n");
  const formatted: string[] = [];
  let indent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Decrease indent for lines starting with }
    if (trimmed.startsWith("}")) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push("  ".repeat(indent) + trimmed);

    // Increase indent after arrow lambda opening
    if (/^->\([^)]*\)\s*\{$/.test(trimmed)) {
      indent++;
    }
  }

  return formatted.join("\n");
}

/**
 * Format code based on language
 */
export async function formatCode(
  code: string,
  language: "javascript" | "ruby" | "sql",
): Promise<string> {
  switch (language) {
    case "javascript":
      return formatJS(code);
    case "sql":
      return formatSQL(code);
    case "ruby":
      return formatRuby(code);
    default:
      return code;
  }
}
