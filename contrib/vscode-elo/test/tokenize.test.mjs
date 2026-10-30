/**
 * Tokenises fixtures/sample.elo with the real VS Code TextMate engine
 * (vscode-textmate + Oniguruma) and asserts the scope of representative tokens.
 *
 *   node test/tokenize.test.mjs            run the assertions
 *   node test/tokenize.test.mjs --dump     print every token and its scopes
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);

// Les deux paquets sont en CommonJS : on les charge via require.
const oniguruma = require('vscode-oniguruma');
const vsctm = require('vscode-textmate');

async function loadGrammar() {
  const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await oniguruma.loadWASM(wasm);
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
      createOnigString: s => new oniguruma.OnigString(s),
    }),
    loadGrammar: async scopeName => {
      if (scopeName !== 'source.elo') return null;
      const raw = await readFile(join(root, 'syntaxes/elo.tmLanguage.json'), 'utf-8');
      return vsctm.parseRawGrammar(raw, 'elo.tmLanguage.json');
    },
  });
  const grammar = await registry.loadGrammar('source.elo');
  if (!grammar) throw new Error('grammar source.elo could not be loaded');
  return grammar;
}

/** @returns {{text: string, scopes: string[], line: number}[]} */
function tokenize(grammar, source) {
  const tokens = [];
  let state = vsctm.INITIAL;
  source.split('\n').forEach((line, i) => {
    const result = grammar.tokenizeLine(line, state);
    for (const t of result.tokens) {
      const text = line.slice(t.startIndex, t.endIndex);
      if (text.trim() !== '') tokens.push({ text, scopes: t.scopes, line: i + 1 });
    }
    state = result.ruleStack;
  });
  return tokens;
}

/**
 * Chaque cas : [texte du token, scope attendu].
 * Le scope attendu doit être le scope le plus spécifique porté par le token.
 */
const CAS = [
  // commentaires et chaînes
  ['#', 'punctuation.definition.comment.elo'],
  [' Elo syntax sample — exercises every construct the grammar must colour.', 'comment.line.number-sign.elo'],
  ["\\'", 'constant.character.escape.elo'],
  ['\\n', 'constant.character.escape.elo'],

  // mots-clés
  ['let', 'keyword.control.elo'],
  ['if', 'keyword.control.elo'],
  ['then', 'keyword.control.elo'],
  ['else', 'keyword.control.elo'],
  ['guard', 'keyword.control.assertion.elo'],
  ['check', 'keyword.control.assertion.elo'],
  ['and', 'keyword.operator.logical.word.elo'],
  ['not', 'keyword.operator.logical.word.elo'],
  ['fn', 'keyword.declaration.function.elo'],

  // constantes
  ['true', 'constant.language.boolean.elo'],
  ['false', 'constant.language.boolean.elo'],
  ['3.14', 'constant.numeric.decimal.elo'],
  ['42', 'constant.numeric.decimal.elo'],

  // littéraux temporels — doivent gagner sur « nom de type »
  ['D1984-02-29', 'constant.numeric.date.elo'],
  ['D2024-01-15T10:30:00.123Z', 'constant.numeric.datetime.elo'],
  ['PT1H30M', 'constant.numeric.duration.elo'],
  ['P1Y2M3D', 'constant.numeric.duration.elo'],
  ['P3D', 'constant.numeric.duration.elo'],
  ['TODAY', 'constant.language.temporal.elo'],
  ['SOW', 'constant.language.temporal.elo'],
  ['YESTERDAY', 'constant.language.temporal.elo'],

  // types : built-in vs définis par l'utilisateur
  ['Int', 'support.type.builtin.elo'],
  ['String', 'support.type.builtin.elo'],
  ['Null', 'support.type.builtin.elo'],
  ['PosInt', 'entity.name.type.elo'],
  ['Person', 'entity.name.type.elo'],
  ['People', 'entity.name.type.elo'],
  ['Mixed', 'entity.name.type.elo'],

  // fonctions
  ['map', 'support.function.elo'],
  ['upper', 'support.function.elo'],
  ['fetch', 'support.function.elo'],
  ['count', 'support.function.elo'],
  ['double', 'entity.name.function.elo'],

  // paramètres de lambda
  ['a', 'variable.parameter.elo'],
  ['b', 'variable.parameter.elo'],

  // clés / labels et accès membre
  ['name', 'variable.other.property.elo'],
  ['nickname', 'variable.other.property.elo'],
  ['positive', 'variable.other.property.elo'],
  ['sane', 'variable.other.property.elo'],
  ['consistent', 'variable.other.property.elo'],

  // la variable d'entrée implicite
  ['_', 'variable.language.input.elo'],

  // opérateurs
  ['|>', 'keyword.operator.pipe.elo'],
  ['~>', 'keyword.operator.arrow.elo'],
  ['...', 'keyword.operator.range.elo'],
  ['..', 'keyword.operator.range.elo'],
  ['==', 'keyword.operator.comparison.elo'],
  ['>=', 'keyword.operator.comparison.elo'],
  ['&&', 'keyword.operator.logical.elo'],
  ['||', 'keyword.operator.logical.elo'],
  ['!', 'keyword.operator.logical.elo'],
  ['^', 'keyword.operator.arithmetic.elo'],
  ['%', 'keyword.operator.arithmetic.elo'],
  ['?', 'keyword.operator.optional.elo'],
];

const grammar = await loadGrammar();
const source = await readFile(join(root, 'fixtures/sample.elo'), 'utf-8');
const tokens = tokenize(grammar, source);

if (process.argv.includes('--dump')) {
  for (const t of tokens) {
    console.log(`${String(t.line).padStart(3)}  ${JSON.stringify(t.text).padEnd(30)} ${t.scopes.slice(1).join(' ') || '(aucun)'}`);
  }
  process.exit(0);
}

let echecs = 0;
for (const [texte, attendu] of CAS) {
  const trouves = tokens.filter(t => t.text === texte);
  if (trouves.length === 0) {
    console.log(`✗ token absent de la fixture : ${JSON.stringify(texte)}`);
    echecs++;
    continue;
  }
  // Le scope attendu doit être le plus spécifique d'au moins une occurrence.
  const ok = trouves.some(t => t.scopes[t.scopes.length - 1] === attendu);
  if (!ok) {
    const vus = [...new Set(trouves.map(t => t.scopes[t.scopes.length - 1]))];
    console.log(`✗ ${JSON.stringify(texte)}\n    attendu : ${attendu}\n    obtenu  : ${vus.join(', ')}`);
    echecs++;
  }
}

// Les références de variables n'ont légitimement pas de scope (le thème leur
// applique sa couleur de texte par défaut). En revanche, tout token nu
// contenant un opérateur, une ponctuation, un chiffre ou une majuscule signale
// un trou dans la grammaire.
const REFERENCE_NUE = /^[a-z_][A-Za-z0-9_]*$/;
const trous = tokens
  .filter(t => t.scopes.length === 1)
  .filter(t => !REFERENCE_NUE.test(t.text.trim()));
if (trous.length) {
  console.log(`✗ ${trous.length} token(s) non reconnu(s) par la grammaire :`);
  for (const t of trous.slice(0, 15)) console.log(`    L${t.line} ${JSON.stringify(t.text)}`);
  echecs += trous.length;
}

const nus = tokens.filter(t => t.scopes.length === 1).length;
console.log(echecs === 0
  ? `\n✓ ${CAS.length} scopes vérifiés · ${tokens.length} tokens · ` +
    `${nus} références de variables sans scope (attendu) · aucun trou de grammaire\n`
  : `\n${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
