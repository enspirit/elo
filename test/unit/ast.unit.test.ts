import { describe, it } from 'node:test';
import assert from 'node:assert';
import { literal, variable, binary, unary, typeRef, withTypeDefs, letExpr } from '../../src/ast';

describe('AST - literal() helper', () => {
  it('should create numeric literal', () => {
    const node = literal(42);
    assert.deepStrictEqual(node, {
      type: 'literal',
      value: 42
    });
  });

  it('should create floating point literal', () => {
    const node = literal(3.14);
    assert.deepStrictEqual(node, {
      type: 'literal',
      value: 3.14
    });
  });

  it('should create boolean true literal', () => {
    const node = literal(true);
    assert.deepStrictEqual(node, {
      type: 'literal',
      value: true
    });
  });

  it('should create boolean false literal', () => {
    const node = literal(false);
    assert.deepStrictEqual(node, {
      type: 'literal',
      value: false
    });
  });

  it('should create zero literal', () => {
    const node = literal(0);
    assert.deepStrictEqual(node, {
      type: 'literal',
      value: 0
    });
  });
});

describe('AST - variable() helper', () => {
  it('should create variable node', () => {
    const node = variable('x');
    assert.deepStrictEqual(node, {
      type: 'variable',
      name: 'x'
    });
  });

  it('should handle multi-character names', () => {
    const node = variable('price');
    assert.deepStrictEqual(node, {
      type: 'variable',
      name: 'price'
    });
  });

  it('should handle underscores', () => {
    const node = variable('user_name');
    assert.deepStrictEqual(node, {
      type: 'variable',
      name: 'user_name'
    });
  });
});

describe('AST - binary() helper', () => {
  it('should create addition node', () => {
    const node = binary('+', literal(1), literal(2));
    assert.strictEqual(node.type, 'binary');
    assert.strictEqual(node.operator, '+');
    assert.deepStrictEqual(node.left, { type: 'literal', value: 1 });
    assert.deepStrictEqual(node.right, { type: 'literal', value: 2 });
  });

  it('should create subtraction node', () => {
    const node = binary('-', literal(5), literal(3));
    assert.strictEqual(node.operator, '-');
  });

  it('should create multiplication node', () => {
    const node = binary('*', literal(4), literal(3));
    assert.strictEqual(node.operator, '*');
  });

  it('should create division node', () => {
    const node = binary('/', literal(10), literal(2));
    assert.strictEqual(node.operator, '/');
  });

  it('should create modulo node', () => {
    const node = binary('%', literal(10), literal(3));
    assert.strictEqual(node.operator, '%');
  });

  it('should create power node', () => {
    const node = binary('^', literal(2), literal(3));
    assert.strictEqual(node.operator, '^');
  });

  it('should create less than node', () => {
    const node = binary('<', variable('x'), literal(10));
    assert.strictEqual(node.operator, '<');
  });

  it('should create greater than node', () => {
    const node = binary('>', variable('x'), literal(10));
    assert.strictEqual(node.operator, '>');
  });

  it('should create less than or equal node', () => {
    const node = binary('<=', variable('x'), literal(10));
    assert.strictEqual(node.operator, '<=');
  });

  it('should create greater than or equal node', () => {
    const node = binary('>=', variable('x'), literal(10));
    assert.strictEqual(node.operator, '>=');
  });

  it('should create equality node', () => {
    const node = binary('==', variable('x'), literal(10));
    assert.strictEqual(node.operator, '==');
  });

  it('should create inequality node', () => {
    const node = binary('!=', variable('x'), literal(10));
    assert.strictEqual(node.operator, '!=');
  });

  it('should create AND node', () => {
    const node = binary('&&', literal(true), literal(false));
    assert.strictEqual(node.operator, '&&');
  });

  it('should create OR node', () => {
    const node = binary('||', literal(true), literal(false));
    assert.strictEqual(node.operator, '||');
  });

  it('should allow nested binary operations', () => {
    const inner = binary('+', literal(1), literal(2));
    const outer = binary('*', inner, literal(3));
    assert.strictEqual(outer.type, 'binary');
    assert.strictEqual(outer.operator, '*');
    assert.strictEqual(outer.left.type, 'binary');
  });
});

describe('AST - unary() helper', () => {
  it('should create unary minus node', () => {
    const node = unary('-', literal(5));
    assert.strictEqual(node.type, 'unary');
    assert.strictEqual(node.operator, '-');
    assert.deepStrictEqual(node.operand, { type: 'literal', value: 5 });
  });

  it('should create unary plus node', () => {
    const node = unary('+', literal(5));
    assert.strictEqual(node.operator, '+');
  });

  it('should create NOT node', () => {
    const node = unary('!', variable('active'));
    assert.strictEqual(node.operator, '!');
    assert.deepStrictEqual(node.operand, { type: 'variable', name: 'active' });
  });

  it('should allow nested unary operations', () => {
    const inner = unary('-', literal(5));
    const outer = unary('-', inner);
    assert.strictEqual(outer.type, 'unary');
    assert.strictEqual(outer.operand.type, 'unary');
  });
});

describe('AST - Complex tree construction', () => {
  it('should build (a + b) * c', () => {
    const tree = binary(
      '*',
      binary('+', variable('a'), variable('b')),
      variable('c')
    );
    assert.strictEqual(tree.type, 'binary');
    assert.strictEqual(tree.operator, '*');
    assert.strictEqual(tree.left.type, 'binary');
  });

  it('should build !(x > 10)', () => {
    const tree = unary(
      '!',
      binary('>', variable('x'), literal(10))
    );
    assert.strictEqual(tree.type, 'unary');
    assert.strictEqual(tree.operator, '!');
    assert.strictEqual(tree.operand.type, 'binary');
  });

  it('should build complex boolean expression', () => {
    const tree = binary(
      '&&',
      binary('>', variable('x'), literal(0)),
      binary('<', variable('x'), literal(100))
    );
    assert.strictEqual(tree.type, 'binary');
    assert.strictEqual(tree.operator, '&&');
    assert.strictEqual(tree.left.type, 'binary');
    assert.strictEqual(tree.right.type, 'binary');
  });
});

describe('AST - withTypeDefs() helper', () => {
  it('returns the body untouched when there is nothing to scope', () => {
    const body = literal(1);
    assert.strictEqual(withTypeDefs([], body), body);
  });

  it('scopes the definitions in one node, in the order they were written', () => {
    const scoped = withTypeDefs(
      [
        { name: 'A', typeExpr: typeRef('Int') },
        { name: 'B', typeExpr: typeRef('A') }
      ],
      variable('x')
    );
    assert.deepStrictEqual(scoped, {
      type: 'typedef',
      definitions: [
        { name: 'A', typeExpr: { kind: 'type_ref', name: 'Int' } },
        { name: 'B', typeExpr: { kind: 'type_ref', name: 'A' } }
      ],
      body: { type: 'variable', name: 'x' }
    });
  });

  it('costs one level of nesting whatever the number of definitions', () => {
    // A prelude collects the types a file shares, so its size must not count
    // against the depth guards: a hundred definitions used to be refused.
    const scoped = withTypeDefs(
      Array.from({ length: 120 }, (_, i) => ({ name: `T${i}`, typeExpr: typeRef('Int') })),
      variable('x')
    );
    assert.strictEqual(scoped.type, 'typedef');
    if (scoped.type === 'typedef') {
      assert.strictEqual(scoped.definitions.length, 120);
      assert.deepStrictEqual(scoped.body, { type: 'variable', name: 'x' });
    }
  });

  it('refuses two definitions of the same name', () => {
    // One name, two types is meaningless, and the definitions share a scope in
    // every target — on JS the emitted declaration would not even be legal.
    assert.throws(
      () => withTypeDefs(
        [
          { name: 'T', typeExpr: typeRef('Int') },
          { name: 'T', typeExpr: typeRef('String') }
        ],
        variable('x')
      ),
      /Duplicate type definition 'T'/
    );
  });
});

describe('AST - letExpr() helper', () => {
  it('keeps the bindings flat, in the order they were written', () => {
    const node = letExpr(
      [{ name: 'x', value: literal(1) }, { name: 'y', value: literal(2) }],
      variable('x')
    );
    assert.deepStrictEqual(node, {
      type: 'let',
      bindings: [
        { name: 'x', value: { type: 'literal', value: 1 } },
        { name: 'y', value: { type: 'literal', value: 2 } }
      ],
      body: { type: 'variable', name: 'x' }
    });
  });

  it('refuses at least one binding', () => {
    assert.throws(() => letExpr([], variable('x')), /at least one binding/);
  });

  it('refuses two bindings of the same name', () => {
    // The bindings share a scope, and the targets do not agree on what a
    // repeated name means there — on JS the emitted code is not even legal.
    assert.throws(
      () => letExpr(
        [{ name: 'x', value: literal(1) }, { name: 'x', value: literal(2) }],
        variable('x')
      ),
      /Duplicate binding 'x'/
    );
  });

  it('refuses a binding that rebinds a name from its own value', () => {
    // `let x = 1, x = x + 1 in x` reads as a sequential rebinding, and that is
    // what Ruby and Python emit — but the same program does not run on JS.
    assert.throws(
      () => letExpr(
        [
          { name: 'x', value: literal(1) },
          { name: 'x', value: binary('+', variable('x'), literal(1)) }
        ],
        variable('x')
      ),
      /Duplicate binding 'x'/
    );
  });
});
