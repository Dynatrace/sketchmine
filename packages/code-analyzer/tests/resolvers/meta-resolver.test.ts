import { getParsedResult, resolveReferences } from '../helpers';
import {
  ParseObjectLiteral,
  MetaResolver,
  ParseArrayLiteral,
  ParseLocation,
  ParseValueType,
  ParseProperty,
  ParseTypeLiteral,
  ParseDecorator,
  applyTransformers,
  ParseResult,
  parseFile,
} from '../../src';
import { join } from 'path';

const jsonResolver = new MetaResolver();

describe('[code-analyzer] › MetaResolver › drop irrelevant root nodes', () => {

  test('a function declaration should be dropped as root node', () => {
    const source = 'function a(): boolean { return true }';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });

  test('a class declaration as root node should be dropped', () => {
    const source = 'class X { member: boolean; }';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });

  test('an angular component should not be dropped!', () => {
    const source = `
      @Component({ selector: 'my-selector'})
      export class myComponent {
        @Input()
        get member(): boolean { return true; }
        set member(value: boolean) { }
      }
    `;
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      name: 'myComponent',
      angularComponent: true,
      decorator: { selector: '"my-selector"' },
      members: [
        {
          type: 'property',
          key: 'member',
          value: ['true', 'false'],
        },
        {
          type: 'method',
          key: 'member',
          parameters: [{ type: 'property', key: 'value', value: ['true'] }],
        },
      ],
    });
  });

  test('a variable declaration as root node should be dropped', () => {
    const source = 'let a: number; const x = 1;';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });

  test('a type alias declaration should be dropped as root node', () => {
    const source = 'type x = "a" | "b"';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });

  test('an enum declaration should be dropped as root node', () => {
    const source = 'enum Direction {  Up = 1, Down, Left,  Right, }';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });

  test('an interface declaration should be dropped as root node', () => {
    const source = 'interface a { b: string; }';
    const result = getParsedResult(source) as any;
    const resolved = result.visit(jsonResolver);
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toHaveLength(0);
  });
});

describe('[code-analyzer] › MetaResolver › resolving all different nodes', () => {
  const testLocation = new ParseLocation('test-file.ts', 10);

  test('visitAllWithParent should return an empty array if nothing is provided', () => {
    const result = jsonResolver.visitAllWithParent(null, null);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(0);
  });

  test('visitWithParent should return undefined if nothing is provided', () => {
    const result = jsonResolver.visitWithParent(null, null);
    expect(result).toBe(undefined);
  });

  test('resolving a partial should return null in case that we don\'t rely on Partials', () => {
    const source = 'type a = Partial<"a" | "b">;';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toBeNull();
  });

  test('resolve an array literal to an array', () => {
    const value1 = new ParseValueType(testLocation, 'a');
    const value2 = new ParseValueType(testLocation, 'b');
    const literal = new ParseArrayLiteral(testLocation, [], [value1, value2]);
    const resolved = literal.visit(jsonResolver);
    expect(resolved).toMatchObject(['a', 'b']);
  });

  test('resolve an object literal to an array', () => {
    const value1 = new ParseValueType(testLocation, 'c');
    const value2 = new ParseValueType(testLocation, 'd');
    const prop1 = new ParseProperty(testLocation, 'a', [], value1);
    const prop2 = new ParseProperty(testLocation, 'b', [], value2);
    const literal = new ParseObjectLiteral(testLocation, [], [prop1, prop2]);
    const resolved = literal.visit(jsonResolver);
    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['c'] },
      { type: 'property', key: 'b', value: ['d'] },
    ]);
  });

  test('resolve a type literal to an array', () => {
    const value1 = new ParseValueType(testLocation, 'c');
    const value2 = new ParseValueType(testLocation, 'd');
    const prop1 = new ParseProperty(testLocation, 'a', [], value1);
    const prop2 = new ParseProperty(testLocation, 'b', [], value2);
    const literal = new ParseTypeLiteral(testLocation, [prop1, prop2]);
    const resolved = literal.visit(jsonResolver);
    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['c'] },
      { type: 'property', key: 'b', value: ['d'] },
    ]);
  });

  test('unknown decorator should return undefined', () => {
    const decorator = new ParseDecorator(testLocation, 'CustomDecorator', []);
    const resolved = decorator.visit(jsonResolver);
    expect(resolved).toBe(undefined);
  });

  test('resolving an objectLiteral to a property', () => {
    const source = 'const x =  {a: \'b\'};';
    const result = getParsedResult(source).nodes[0] as any;
    const resolved = result.visit(jsonResolver);

    expect(resolved[0]).toMatchObject({
      type: 'property',
      key: 'a',
      // tslint:disable-next-line: quotemark
      value : ["\"b\""],
    });
  });

  test('a boolean type should be resolved into a stringified true', () => {
    const source = 'let a:boolean';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toBe('true');
  });

  test('null as type should be resolved into a stringified null value', () => {
    const source = 'let a:null;';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toBeNull();
  });

  test('when variable declaration has no type use the value', () => {
    const source = 'const two = 2';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toBe('2');
  });

  test('when variable declaration a type prefer it before value', () => {
    const source = 'type myType = 1 | 2; const two: myType = 2';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[1].visit(jsonResolver);
    expect(resolved).not.toBe('2');
    expect(resolved).toBeInstanceOf(Array);
    expect(resolved).toMatchObject(['1', '2']);
  });

  test('a generic should return its value', () => {
    const source = 'export type a<T> = () => T; const a:a<"valueType">;';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[1].visit(jsonResolver);

    expect(resolved).toMatch('valueType');
  });

  test('a intersection type should be combining all values', () => {
    const source = `
      export interface X { a: boolean }
      export interface Y { b: 1 }
      function c(): X & Y {};
    `;
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[2].visit(jsonResolver);
    expect(resolved.returnType).toMatchObject([
      { type: 'property', key: 'a', value: ['true', 'false'] },
      { type: 'property', key: 'b', value: ['1'] },
    ]);
  });

  test('drop class that is marked as design-unrelated', () => {
    const source = `
    /** @design-unrelated */
    @Component({})
    class DtAnchor {
      myMember: number = 1;
    }`;

    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toBeUndefined();
  });

  // test('when generic has no type use the value', () => {

  // });

  // test('when a property has no type use the value', () => {

  // });
});

describe('[code-analyzer] › MetaResolver › testing class members', () => {

  test('a private member should be dropped', () => {
    const source = 'class a { private a: 1; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a protected member should be dropped', () => {
    const source = 'class a { protected a: 1; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a public member should not be dropped', () => {
    const source = 'class a { public a: 1; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['1'] },
    ]);
  });

  test('a member without any keyword should not be dropped', () => {
    const source = 'class a { a: 1; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['1'] },
    ]);
  });

  test('a member with a leading underscore in the name should be dropped', () => {
    const source = 'class a { _a: 1; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a member with an @internal in the jsdoc should be dropped', () => {
    const source = `
      class a {
        /** @internal */
        a: 1;
      }
    `;
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a method member with a leading underscore in the name should be dropped', () => {
    const source = 'class a { _a(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a method member with a private keyword should be dropped', () => {
    const source = 'class a { private a(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a method member with a protected keyword should be dropped', () => {
    const source = 'class a { protected a(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('a method member with a public keyword should not be dropped', () => {
    const source = 'class a { public a(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([
      { type: 'method', key: 'a', parameters: [], returnType: 'void' },
    ]);
  });

  test('a method member with a @internal in the jsdoc should be dropped', () => {
    const source = `
      class a {
        /** @internal */
        public a(): void {}
      }
    `;
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngOnChanges should be dropped', () => {
    const source = 'class a { ngOnChanges(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngOnInit should be dropped', () => {
    const source = 'class a { ngOnInit(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngDoCheck should be dropped', () => {
    const source = 'class a { ngDoCheck(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngAfterContentInit should be dropped', () => {
    const source = 'class a { ngAfterContentInit(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngAfterContentChecked should be dropped', () => {
    const source = 'class a { ngAfterContentChecked(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngAfterViewInit should be dropped', () => {
    const source = 'class a { ngAfterViewInit(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngAfterViewChecked should be dropped', () => {
    const source = 'class a { ngAfterViewChecked(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });

  test('Angular life cycle method ngOnDestroy should be dropped', () => {
    const source = 'class a { ngOnDestroy(): void {} }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[0].visit(jsonResolver);
    expect(resolved).toMatchObject([]);
  });
});

describe('[code-analyzer] › MetaResolver › test merging constraints', () => {

  test('extends of a class should be merged into the base class', () => {
    const source = 'export class a { a: 1; } class b extends a { b: 2; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[1].visit(jsonResolver);

    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['1'] },
      { type: 'property', key: 'b', value: ['2'] },
    ]);
  });

  test('extends of an interface should be merged into the base interface', () => {
    const source = 'export interface a { a: 1; } interface b extends a { b: 2; }';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[1].visit(jsonResolver);

    expect(resolved).toMatchObject([
      { type: 'property', key: 'a', value: ['1'] },
      { type: 'property', key: 'b', value: ['2'] },
    ]);
  });

  test('a generic with a constraint should be merged and flattened', () => {
    const source = 'export class a { a: 1; } export function b<T extends a> (): T {} const c = b();';
    const result = getParsedResult(source) as any;
    const nodes = resolveReferences(result).nodes as any[];
    const resolved = nodes[2].visit(jsonResolver);

    expect(resolved).toMatchObject([{
      type: 'property',
      key: 'a',
      value: ['1'],
    }]);
  });
});

test('resolving a full fledged Button component', async () => {
  const paths = new Map<string, string>();
  const result = new Map<string, ParseResult>();

  await parseFile(join(__dirname, '..', 'fixtures', 'button.ts'), paths, result, 'node_modules');

  const transformed = applyTransformers<any>(result)[0].members;
  expect(transformed).toMatchObject(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'property',
        key: 'disabled',
        value: ['true', 'false'],
      }),
      expect.objectContaining({
        type: 'property',
        key: 'color',
        // tslint:disable-next-line: quotemark
        value: ["\"main\"", "\"warning\"", "\"cta\""],
      }),
      expect.objectContaining({
        type: 'property',
        key: 'variant',
        // tslint:disable-next-line: quotemark
        value: ["\"primary\"", "\"secondary\"", "\"nested\""],
      }),
      expect.objectContaining({
        type: 'method',
        key: 'focus',
        parameters: [],
        returnType: 'void',
      }),
    ]),
  );

});
