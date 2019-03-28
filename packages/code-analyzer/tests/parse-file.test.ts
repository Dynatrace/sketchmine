import { vol, fs as mockedFs } from 'memfs';
jest.mock('fs', () => mockedFs);

import {
  parseFile,
  ParseResult,
  adjustPathAliases,
  ParseReferenceType,
  ReferenceResolver,
  ParseTypeAliasDeclaration,
  ParsePrimitiveType,
  ParseInterfaceDeclaration,
  ParseProperty,
  applyTransformers,
} from '../src';
import { join } from 'path';

let fileTree: { [key: string]: string };
let paths = new Map<string, string>();
let result = new Map<string, ParseResult>();

const config = {
  compilerOptions: {
    paths: {
      '@dynatrace/angular-components': ['src/lib'],
      '@dynatrace/angular-components/*': ['src/lib/*'],
    },
  },
};

// reset the mocked volume after each test
afterEach(vol.reset.bind(vol));

beforeEach(() => {
  // reset the results map and the paths map
  paths.clear();
  result.clear();
  fileTree = {
    'src/lib/button/button.ts': 'import {MixinDisabled} from "../core"; export class Button extends MixinDisabled {}',
    'src/lib/button/index.ts': 'export * from "./button"',
    'src/lib/index.ts': 'export * from "./button"',
    'src/lib/core/index.ts': 'export * from "./mixin-disabled"',
    'src/lib/core/mixin-disabled.ts': 'export class MixinDisabled { disabled: boolean; }',
  };
});

describe('[code-analyzer] › parse files with dependency tree', () => {

  test('when we pass the entry point every file should be parsed', async () => {
    vol.fromJSON(fileTree);
    await parseFile('src/lib/index.ts', paths, result, 'node_modules');
    expect(result.size).toBe(5);
    expect(result.get(join(process.cwd(), 'src/lib/button/index.ts')).dependencyPaths).toHaveLength(1);
    expect(result.get(join(process.cwd(), 'src/lib/button/button.ts')).nodes).toHaveLength(1);
    expect(result.get(join(process.cwd(), 'src/lib/button/button.ts')).dependencyPaths).toHaveLength(1);
    expect(result.get(join(process.cwd(), 'src/lib/core/mixin-disabled.ts')).nodes).toHaveLength(1);
    expect(result.get(join(process.cwd(), 'src/lib/core/mixin-disabled.ts')).dependencyPaths).toHaveLength(0);
  });

  test('if the was already parsed skip this file and parse the other files', async () => {
    vol.fromJSON(fileTree);
    await parseFile('src/lib/button/button.ts', paths, result, 'node_modules');
    await parseFile('src/lib/index.ts', paths, result, 'node_modules');

    expect(result.size).toBe(5);
  });

  test('if a file path could not be parsed it should log an error and skip this file', async () => {
    fileTree['src/lib/core/index.ts'] = 'export * from "./wrong-path"';
    vol.fromJSON(fileTree);

    const logging = jest.spyOn(console, 'log');

    expect(logging).toHaveBeenCalledTimes(0);
    await parseFile('src/lib/index.ts', paths, result, 'node_modules');
    expect(logging).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(4);
  });

  test('collecting a file from a path alias without the paths should fail', async () => {
    fileTree['src/lib/button/button.ts'] =
      'import {MixinDisabled} from "@dynatrace/angular-components/core"; export class Button extends MixinDisabled {}';
    vol.fromJSON(fileTree);
    await parseFile('src/lib/index.ts', paths, result, 'node_modules');
    expect(result.size).toBe(3);
    expect(result.get(join(process.cwd(), 'src/lib/index.ts'))).toBeInstanceOf(ParseResult);
    expect(result.get(join(process.cwd(), 'src/lib/button/index.ts'))).toBeInstanceOf(ParseResult);
    expect(result.get(join(process.cwd(), 'src/lib/button/button.ts'))).toBeInstanceOf(ParseResult);
  });

  test('collecting a file from a path alias without the paths should fail', async () => {
    fileTree['src/lib/button/button.ts'] =
      'import {MixinDisabled} from "@dynatrace/angular-components/core"; export class Button extends MixinDisabled {}';

    paths = adjustPathAliases(config, 'src/lib');
    vol.fromJSON(fileTree);

    await parseFile('src/lib/index.ts', paths, result, 'node_modules');
    expect(result.size).toBe(5);
  });
});

describe('[code-analyzer] › resolve references across multiple files', () => {

  function resolveReferences() {
    const refResolver = new ReferenceResolver(result);

    const transformedResults = new Map<string, ParseResult>();
    result.forEach((result, fileName) => {
      transformedResults.set(fileName, result.visit(refResolver));
    });
    result = transformedResults;
  }

  test('resolving constructor type that is located in a different file', async () => {
    vol.fromJSON({
      'lib/src/core/constructor.ts': 'export type Constructor<T> = new(...args: any[]) => T',
      'lib/src/core/index.ts': 'export * from "./constructor"',
      'lib/src/button/button.ts': 'import {Constructor} from "../core"; let a: Constructor<string>;',
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');
    const node = result.get(join(process.cwd(), 'lib/src/button/button.ts')).nodes[0] as any;

    expect(node.type).toBeInstanceOf(ParseReferenceType);
    expect(node.type.name).toBe('Constructor');

    resolveReferences();

    const resolvedNode =  result.get(join(process.cwd(), 'lib/src/button/button.ts')).nodes[0] as any;

    expect(resolvedNode.type).toBeInstanceOf(ParseTypeAliasDeclaration);
    expect(resolvedNode.type.name).toBe('Constructor');
    expect(resolvedNode.type.type.returnType.type).toBeInstanceOf(ParsePrimitiveType);
    expect(resolvedNode.type.type.returnType.type.type).toBe('string');
  });

  test('resolving generics from different files', async () => {
    vol.fromJSON({
      'lib/src/core/constructor.ts': 'export type Constructor<T> = new(...args: any[]) => T',
      'lib/src/core/index.ts': 'export * from "./constructor"',
      'lib/src/button/button.ts': `
        import {Constructor} from "../core";
        interface A { a: boolean }
        function m(): Constructor<A> {}
        const x = m();
      `,
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');

    resolveReferences();

    const resolvedNode =  result.get(join(process.cwd(), 'lib/src/button/button.ts')).nodes[2] as any;
    const constructorType = resolvedNode.value.returnType.type;
    expect(constructorType.returnType.type).toBeInstanceOf(ParseInterfaceDeclaration);
    expect(constructorType.returnType.type.name).toBe('A');
    expect(constructorType.returnType.type.members).toBeInstanceOf(Array);
    expect(constructorType.returnType.type.members[0]).toBeInstanceOf(ParseProperty);
    expect(constructorType.returnType.type.members[0].name).toBe('a');
  });

  test('resolving simple mixin with constraint', async() => {
    vol.fromJSON({
      '/index.ts': `
        export type Constructor<T> = new(...args: any[]) => T;
        interface I1 { i: boolean; }
        interface I2  { i2: 1; }
        function f<T extends Constructor<I1>>(a: T): T & Constructor<I2> { return a as any; }
        const mixin = f
        @Component({
          inputs: ['i', 'i2'],
        })
        class DtButton extends mixin {}
      `,
    });

    await parseFile('/index.ts', paths, result, 'node_modules');

    const transformed = applyTransformers<any>(result)[0].members;
    expect(transformed[0]).toMatchObject({ type: 'property', key: 'i', value: ['true', 'false'] });
    expect(transformed[1]).toMatchObject({ type: 'property', key: 'i2', value: ['1'] });
  });

  test('resolving generics from different files', async () => {
    vol.fromJSON({
      'lib/src/core/constructor.ts': 'export type Constructor<C> = new(...args: any[]) => C',
      'lib/src/core/index.ts': 'export * from "./constructor"',
      'lib/src/button/button.ts': `
        import { Constructor } from '../core'
        interface CanDisable { disabled: boolean; }
        function mixinDisabled<T extends Constructor<{}>>(base: T): Constructor<CanDisable> & T { }
        class DtButtonBase { constructor(public elementRef: boolean) { } }
        const _DtButtonMixinBase = mixinDisabled(DtButtonBase);
        @Component({
          inputs: ['disabled'],
        })
        class DtButton extends _DtButtonMixinBase {}
      `,
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');

    const transformed = applyTransformers<any>(result);
    const members = transformed[0].members;

    expect(members).toHaveLength(1);
    expect(members).toMatchObject([
      { type: 'property', key: 'disabled', value: ['true', 'false'] },
    ]);
  });

  test('resolving mixin disabled over multiple files', async () => {
    vol.fromJSON({
      'lib/src/core/common-behaviors/constructor.ts': `
        export type Constructor<C> = new(...args: any[]) => C`,
      'lib/src/core/common-behaviors/disabled.ts': `
        import { Constructor } from './constructor';
        export interface CanDisable { disabled: boolean; }
        export function mixinDisabled<T extends Constructor<{}>>(base: T): Constructor<CanDisable> & T { }`,
      'lib/src/core/common-behaviors/index.ts': `
        export * from './constructor';
        export * from './disabled';`,
      'lib/src/core/index.ts': `
        export * from './common-behaviors';`,
      'lib/src/button/button.ts': `
        import { mixinDisabled } from '../core';
        class DtButtonBase { constructor(public elementRef: 'ElementRef') { } }
        const _DtButtonMixinBase = mixinDisabled(DtButtonBase);
        @Component({
          inputs: ['disabled', 'elementRef'],
        })
        class DtButton extends _DtButtonMixinBase {}`,
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');

    const transformed = applyTransformers<any>(result);
    const members = transformed[0].members;

    expect(members).toHaveLength(2);
    expect(members).toMatchObject([
      { type: 'property', key: 'disabled', value: ['true', 'false'] },
      // tslint:disable-next-line: quotemark
      { type: 'property', key: 'elementRef', value: ["\"ElementRef\""] },
    ]);
  });

  test('resolving dependent references on each other', async () => {
    vol.fromJSON({
      'lib/src/button-group/index.ts': `
        export * from './button-group-module';
        export * from './button-group';`,
      'lib/src/button-group/button-group.ts': `
        @Component()
        export class DtButtonGroup<T> {
          selectedItem: DtButtonGroupItem<T> | null = null;
        }

        @Component()
        export class DtButtonGroupItem<T> {
          constructor(public buttonGroup: DtButtonGroup<T>) { }
        }
        `,
      'lib/src/button-group/button-group-module.ts': `
        import { DtButtonGroup, DtButtonGroupItem } from './button-group';
        @NgModule({
          declarations: [DtButtonGroup, DtButtonGroupItem]
        })
        export class DtButtonGroupModule {}`,
    });

    await parseFile('lib/src/button-group/index.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);

    expect(transformed).toHaveLength(2);
  });

  test('should resolve the method type as parameter correctly', async () => {
    vol.fromJSON({
      'lib/src/select/select.ts': `
        @Component()
        export class DtSelect {
          @Input()
          get compareWith(): () => boolean { true }
          set compareWith(fn: () => boolean) {  }
        }
        `,
    });

    await parseFile('lib/src/select/select.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);
    expect(transformed[0].members).toHaveLength(1);
    expect(transformed[0].members).toMatchObject([
      {
        type: 'method',
        key: 'compareWith',
        parameters: [],
      },
    ]);
  });

  test('should only use the @Input of an angular component', async () => {
    vol.fromJSON({
      'lib/src/inline-editor/inline-editor.ts': `
        @Component()
        export class DtInlineEditor {
          @Input()
          get required(): boolean { return this._required; }
          set required(value: boolean) { this._required = coerceBooleanProperty(value); }

          get editing(): boolean { return true; }
        }
        `,
    });

    await parseFile('lib/src/inline-editor/inline-editor.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);

    expect(transformed[0].members).toHaveLength(2);
    expect(transformed[0].members).toMatchObject([
      { type: 'property', key: 'required', value: ['true', 'false'] },
      {
        type: 'method',
        key: 'required',
        parameters: [
          { type: 'property', key: 'value', value: ['true', 'false'] },
        ],
      },
    ]);
  });

  test('should drop properties that are extended but not listed as input in the component decorator', async () => {
    vol.fromJSON({
      'lib/src/core/common-behaviors/constructor.ts': `
        export type Constructor<C> = new(...args: any[]) => C`,
      'lib/src/core/common-behaviors/disabled.ts': `
        import { Constructor } from './constructor';
        export interface CanDisable { disabled: boolean; }
        export function mixinDisabled<T extends Constructor<{}>>(base: T): Constructor<CanDisable> & T { }`,
      'lib/src/core/common-behaviors/index.ts': `
        export * from './constructor';
        export * from './disabled';`,
      'lib/src/core/index.ts': `
        export * from './common-behaviors';`,
      'lib/src/button/button.ts': `
        import { mixinDisabled } from '../core';
        class DtButtonBase { constructor(public elementRef: 'ElementRef') { } }
        const _DtButtonMixinBase = mixinDisabled(DtButtonBase);
        @Component({
          inputs: ['disabled'],
        })
        class DtButton extends _DtButtonMixinBase {
          get editing(): boolean { return true; }

          @Input()
          get variant(): boolean { return true; }
          set variant(value: boolean) { }
        }`,
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);

    expect(transformed[0].members).toHaveLength(3);
    expect(transformed[0].members).toMatchObject([
      { type: 'property', key: 'disabled', value: ['true', 'false'] },
      { type: 'property', key: 'variant', value: ['true', 'false'] },
      {
        type: 'method',
        key: 'variant',
        parameters: [
          { type: 'property', key: 'value', value: ['true', 'false'] },
        ],
      },
    ]);
  });

  test('should get the @Input of extended classes', async () => {
    vol.fromJSON({
      'lib/src/core/common-behaviors/constructor.ts': `
        export type Constructor<C> = new(...args: any[]) => C`,
      'lib/src/core/common-behaviors/disabled.ts': `
        import { Constructor } from './constructor';
        export interface CanDisable {
          disabled: boolean;
          someOtherProperty: boolean;
        }
        export function mixinDisabled<T extends Constructor<{}>>(base: T): Constructor<CanDisable> & T { }`,
      'lib/src/core/common-behaviors/index.ts': `
        export * from './constructor';
        export * from './disabled';`,
      'lib/src/core/index.ts': `
        export * from './common-behaviors';`,
      'lib/src/button/button.ts': `
        import { mixinDisabled } from '../core';
        class DtButtonBase { constructor(public elementRef: 'ElementRef') { } }
        const _DtButtonMixinBase = mixinDisabled(DtButtonBase);
        @Component({
          inputs: ['disabled'],
        })
        class DtButton extends _DtButtonMixinBase {
          get editing(): boolean { return true; }
        }`,
    });

    await parseFile('lib/src/button/button.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);

    expect(transformed[0].members).toHaveLength(1);
    expect(transformed[0].members).toMatchObject([
      { type: 'property', key: 'disabled', value: ['true', 'false'] },
    ]);
  });

  // TODO: fix memory leak @lukas.holzer
  test.skip('circular structure should not get heap out of memory', async () => {
    vol.fromJSON({
      'circular-structure.ts': `
      export interface DtNodeDef {
        autocomplete: DtAutocompleteDef | null;
        option: DtOptionDef | null;
        group: DtGroupDef | null;
        freeText: DtFreeTextDef | null;
      }

      export interface DtAutocompleteDef {
        distinct: boolean;
        operators: DtNodeDef[];
        optionsOrGroups: DtNodeDef[];
      }

      export interface DtFreeTextDef {
        suggestions: DtNodeDef[];
      }

      export interface DtGroupDef {
        label: string;
        options: DtNodeDef[];
        parentAutocomplete: DtNodeDef | null;
      }

      export interface DtOptionDef {
        viewValue: string;
        distinctId: string | null;
        parentGroup: DtNodeDef | null;
        parentAutocomplete: DtNodeDef | null;
      }

      @Component()
      export class DtFilterField  {
        autocompleteTrigger: DtAutocompleteTrigger<DtNodeDef>
      }`,
    });
    await parseFile('circular-structure.ts', paths, result, 'node_modules');
    const transformed = applyTransformers<any>(result);

  });
});
