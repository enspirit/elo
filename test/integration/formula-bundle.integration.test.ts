import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadBundle,
  loadCatalogue,
  runCases,
  validateBundle,
  apply,
  describeFields,
  declaredTypes,
  generateFieldsFile,
  refreshFieldsFile,
  docComment,
  caseRunnerSource,
  EXAMPLE_CATALOGUE,
} from '../../contrib/formula-service/src/bundle';
import { parseTypeExpr } from '../../src';

/**
 * The formula bundle format, over every bundle of the catalogue.
 *
 * `contrib/formula-service/formulas/BUNDLE.md` is the specification; this is
 * what holds the catalogue to it. The acceptance suite runs the same cases on Ruby, Python
 * and JavaScript (test/acceptance/test-formulas.sh); what is checked here is
 * the *format* — that a bundle says what a catalogue needs, and says it once.
 *
 * The negative cases matter as much as the positive ones: a lint nobody has
 * seen reject anything is a lint that passes everything.
 */

const CATALOGUE = EXAMPLE_CATALOGUE;

const catalogue = loadCatalogue(CATALOGUE);

describe('Formula bundles - the catalogue', () => {
  it('has bundles to read', () => {
    assert.ok(catalogue.length >= 13, `expected the catalogue, got ${catalogue.length} bundles`);
  });

  for (const bundle of catalogue) {
    describe(bundle.id, () => {
      it('is valid', () => {
        assert.deepEqual(validateBundle(bundle), []);
      });

      it('documents itself', () => {
        assert.notEqual(bundle.title, '', 'no title');
        assert.ok(bundle.doc.length > 40, 'the doc comment says almost nothing');
      });

      it('declares a form', () => {
        assert.ok(bundle.form.length > 0, 'Input declares no field');
        for (const field of bundle.form) {
          assert.ok(field.widget !== '', `${field.path} has no widget`);
          assert.ok(field.label !== '', `${field.path} has no label`);
        }
      });

      it('passes its own cases', () => {
        const wrong = runCases(bundle).filter(row => !row.ok);
        assert.deepEqual(wrong.map(row => row.name), []);
      });

      it('answers a case input through the service expression', () => {
        const first = bundle.cases[0];
        assert.deepEqual(apply(bundle, first.input), first.expect);
      });
    });
  }
});

describe('Formula bundles - the doc comment', () => {
  it('is the leading comment, and stops at the code', () => {
    const { title, doc } = docComment('# A title\n#\n# Prose.\n\nInput = { a: Int }\n# not the doc\n');
    assert.equal(title, 'A title');
    assert.equal(doc, 'Prose.');
  });

  it('is empty for a file that opens with code', () => {
    assert.deepEqual(docComment('Input = { a: Int }\n'), { title: '', doc: '' });
  });
});

describe('Formula bundles - what Input says about the form', () => {
  const form = (type: string) => describeFields(parseTypeExpr(type), new Map());

  it('reads a type per field, in declaration order', () => {
    assert.deepEqual(
      form('{ a: Int, b: String, c: Bool, d: Date, e: Datetime, f: Duration }')
        .map(f => [f.path, f.type, f.widget]),
      [
        ['a', 'Int', 'number'],
        ['b', 'String', 'text'],
        ['c', 'Bool', 'checkbox'],
        ['d', 'Date', 'date'],
        ['e', 'Datetime', 'datetime'],
        ['f', 'Duration', 'duration'],
      ]
    );
  });

  it('makes an optional field optional, however it is written', () => {
    assert.deepEqual(
      form('{ a: Int, b :? Int, c: Int|Null }').map(f => [f.path, f.required]),
      [['a', true], ['b', false], ['c', false]]
    );
  });

  it('carries the names of the constraints that may refuse a value', () => {
    const [field] = form('{ a: Int(i | positive: i > 0, even: i % 2 == 0) }');
    assert.deepEqual(field.constraints, ['positive', 'even']);
    assert.equal(field.type, 'Int', 'a constrained Int is still an Int to a form');
  });

  it('follows a name of the type prelude', () => {
    const types = new Map([['Age', parseTypeExpr('Int(a | notNegative: a >= 0)')]]);
    const [field] = describeFields(parseTypeExpr('{ age: Age }'), types);
    assert.equal(field.type, 'Int');
    assert.deepEqual(field.constraints, ['notNegative']);
  });

  it('flattens a nested schema into dotted paths', () => {
    assert.deepEqual(
      form('{ customer: { name: String, age: Int }, total: Float }').map(f => f.path),
      ['customer.name', 'customer.age', 'total']
    );
  });

  it('marks a list field repeated', () => {
    const [field] = form('{ xs: [Int] }');
    assert.equal(field.repeated, true);
    assert.equal(field.type, 'Int');
  });

  it('takes a wide union as data', () => {
    assert.equal(form('{ x: Int|String }')[0].type, 'Any');
  });

  it('keeps the declared type of every path, nested ones included', () => {
    const types = new Map([['Tier', parseTypeExpr("String(t | known: t == 'gold')")]]);
    const bundle = {
      id: 'x',
      types: new Map([...types, ['Input', parseTypeExpr('{ customer: { tier: Tier }, total: Float }')]]),
    } as unknown as Parameters<typeof declaredTypes>[0];
    const declared = declaredTypes(bundle);
    assert.deepEqual([...declared.keys()], ['customer.tier', 'total']);
    assert.deepEqual(declared.get('customer.tier'), { kind: 'type_ref', name: 'Tier' });
  });

  it('says nothing about the label, which is the half it cannot know', () => {
    const [field] = form('{ vatRate: Float }');
    assert.equal(field.label, 'vatRate', 'the path, until fields.elo says otherwise');
    assert.equal(field.options, undefined);
    assert.equal(field.help, undefined);
  });
});

describe('Formula bundles - the generated runner', () => {
  it('imports the three files of the bundle', () => {
    const source = caseRunnerSource();
    assert.match(source, /import \{ Input, Output \} from '\.\/types'/);
    assert.match(source, /import \{ formula \} from '\.\/formula'/);
    assert.match(source, /import \{ cases \} from '\.\/cases'/);
  });

  it('sends the answer through Output, as the service does', () => {
    assert.match(caseRunnerSource(), /formula\(c\.input \|> Input\) \|> Output/);
  });

  it('only checks when a test run asks it to', () => {
    assert.doesNotMatch(caseRunnerSource(), /check/);
    assert.match(caseRunnerSource({ assert: true }), /check 'every case passes'/);
  });
});

describe('Formula bundles - generating the fields file', () => {
  for (const bundle of catalogue) {
    it(`${bundle.id} is what the generator would write`, () => {
      // Not formatting pedantry: it means `--fields` is a safe refresh, and
      // that nothing in the derived half was typed by hand.
      assert.equal(generateFieldsFile(bundle), bundle.fieldsSource);
    });
  }
});

describe('Formula bundles - refreshing the fields file', () => {
  /** A copy of a real bundle, to edit. */
  function copyOf(id: string) {
    const dir = mkdtempSync(join(tmpdir(), 'elo-bundle-'));
    const copy = join(dir, id);
    cpSync(join(CATALOGUE, id), copy, { recursive: true });
    return { copy, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  it('writes the file rather than printing it, so a redirect cannot truncate it', () => {
    const { copy, cleanup } = copyOf('order-pricing');
    try {
      const before = readFileSync(join(copy, 'fields.elo'), 'utf-8');
      assert.deepEqual(refreshFieldsFile(copy), { file: join(copy, 'fields.elo'), changed: false });
      assert.equal(readFileSync(join(copy, 'fields.elo'), 'utf-8'), before);
    } finally {
      cleanup();
    }
  });

  it('keeps every label, option and help when Input gains a field', () => {
    const { copy, cleanup } = copyOf('order-pricing');
    try {
      const types = join(copy, 'types.elo');
      writeFileSync(types, readFileSync(types, 'utf-8').replace(
        '  quantity: Int(q | atLeastOne: q >= 1),',
        '  quantity: Int(q | atLeastOne: q >= 1),\n  giftWrap :? Bool,'
      ));
      assert.equal(refreshFieldsFile(copy).changed, true);

      const refreshed = loadBundle(copy);
      const byPath = new Map(refreshed.form.map(f => [f.path, f]));
      assert.deepEqual(byPath.get('tier')?.options, ['standard', 'silver', 'gold'], 'lost the options');
      assert.equal(byPath.get('tier')?.label, 'Customer tier', 'lost the label');
      assert.equal(byPath.get('vatRate')?.help, '0.21 for 21%', 'lost the help');
      assert.deepEqual(
        byPath.get('giftWrap'),
        { path: 'giftWrap', label: 'giftWrap', type: 'Bool', widget: 'checkbox', required: false },
        'the new field is there, unlabelled'
      );
      assert.deepEqual(validateBundle(refreshed), []);
    } finally {
      cleanup();
    }
  });

  it('writes a form for a bundle that has none yet', () => {
    const { copy, cleanup } = copyOf('iban');
    try {
      rmSync(join(copy, 'fields.elo'));
      assert.equal(refreshFieldsFile(copy).changed, true);
      assert.deepEqual(
        loadBundle(copy).form,
        [{ path: 'iban', label: 'iban', type: 'String', widget: 'text', required: true, constraints: ['notBlank'] }]
      );
    } finally {
      cleanup();
    }
  });
});

describe('Formula bundles - what the lint refuses', () => {
  /** A copy of a real bundle, to break one rule of. */
  function brokenCopy(id: string, edit: (dir: string) => void) {
    const dir = mkdtempSync(join(tmpdir(), 'elo-bundle-'));
    const copy = join(dir, id);
    cpSync(join(CATALOGUE, id), copy, { recursive: true });
    edit(copy);
    return { copy, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  const patch = (file: string, from: string, to: string) => {
    const source = readFileSync(file, 'utf-8');
    assert.ok(source.includes(from), `fixture no longer contains ${from}`);
    writeFileSync(file, source.replace(from, to));
  };

  it('refuses a formula with no doc comment', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir => {
      const file = join(dir, 'formula.elo');
      writeFileSync(file, readFileSync(file, 'utf-8').replace(/^#[^\n]*\n/gm, ''));
    });
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /does not open with a doc comment/);
    } finally {
      cleanup();
    }
  });

  it('refuses a form field Input does not declare', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'fields.elo'), "path: 'year'", "path: 'yearr'"));
    try {
      const problems = validateBundle(loadBundle(copy)).join('\n');
      assert.match(problems, /a field 'yearr' that Input does not declare/);
      assert.match(problems, /no field for 'year', which Input declares/);
    } finally {
      cleanup();
    }
  });

  it('refuses a form that disagrees with Input about a type', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'fields.elo'), "type: 'Int'", "type: 'String'"));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /says type "String" for 'year', Input says "Int"/);
    } finally {
      cleanup();
    }
  });

  it('refuses a form that disagrees with Input about a constraint', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'fields.elo'), "constraints: ['gregorian']", "constraints: []"));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /says constraints \[\] for 'year'/);
    } finally {
      cleanup();
    }
  });

  it('refuses a field with no label', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'fields.elo'), "label: 'Year'", "label: ''"));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /gives 'year' no label/);
    } finally {
      cleanup();
    }
  });

  it('refuses an option the type that names it refuses', () => {
    const { copy, cleanup } = brokenCopy('order-pricing', dir =>
      patch(join(dir, 'fields.elo'), "'gold'", "'platinum'"));
    try {
      assert.match(
        validateBundle(loadBundle(copy)).join('\n'),
        /offers 'platinum' for 'tier', which Tier refuses/
      );
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle with no fields file', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir => rmSync(join(dir, 'fields.elo')));
    try {
      assert.throws(() => loadBundle(copy), /fields\.elo is missing/);
    } finally {
      cleanup();
    }
  });

  it('refuses a case whose input is not JSON-shaped', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'cases.elo'), 'input: {year: 2024}', 'input: {year: D2024-01-01}'));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /not JSON-shaped/);
    } finally {
      cleanup();
    }
  });

  it('refuses a formula that does not export what a bundle must', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'formula.elo'), '{ formula: isLeapYear }', '{ leapYear: isLeapYear }'));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /does not export/);
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle whose format version is not this one', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'bundle.json'), '"bundle": 1', '"bundle": 2'));
    try {
      assert.match(validateBundle(loadBundle(copy)).join('\n'), /declares format 2/);
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle with a file missing', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      rmSync(join(dir, 'cases.elo')));
    try {
      assert.throws(() => loadBundle(copy), /cases\.elo is missing/);
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle that declares no Input', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'types.elo'), 'Input = {', 'Form = {'));
    try {
      assert.throws(() => loadBundle(copy), /types\.elo does not declare 'Input'/);
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle that declares no Output', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir =>
      patch(join(dir, 'types.elo'), 'Output = Bool', 'Answer = Bool'));
    try {
      assert.throws(() => loadBundle(copy), /types\.elo does not declare 'Output'/);
    } finally {
      cleanup();
    }
  });

  it('refuses a bundle with no types at all', () => {
    const { copy, cleanup } = brokenCopy('leap-year', dir => rmSync(join(dir, 'types.elo')));
    try {
      assert.throws(() => loadBundle(copy), /types\.elo is missing/);
    } finally {
      cleanup();
    }
  });
});

describe('Formula bundles - the catalogue directory', () => {
  it('has no stray formula file beside the bundles', () => {
    const stray = readdirSync(CATALOGUE).filter(entry => entry.endsWith('.elo'));
    assert.deepEqual(stray, [], 'a .elo at the root of the catalogue belongs in a bundle');
  });

  it('keeps the specification next to what it specifies', () => {
    assert.ok(existsSync(join(CATALOGUE, 'BUNDLE.md')));
  });
});
