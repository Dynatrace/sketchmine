import { Component } from '@sketchmine/code-analyzer';
import { readFile } from '@sketchmine/node-helpers';
import { resolve } from 'path';
import {
  mutateVariants,
  singleVariantGenerator,
  variantCombinationGenerator,
} from '../src/angular-app-shell/files/__directory__/src/app/utils/mutate-variants';

let componentFixture;

describe('[app-builder] › utils › generate variant mutations', () => {

  beforeAll(async () => {
    try {
      componentFixture = JSON.parse(await readFile(resolve('./tests/fixtures/component-properties.json')));
    } catch {
      throw new Error('Could not read component properties fixture.');
    }
  });

  test('Should not generate any combinations if no properties are given.', () => {
    const result = variantCombinationGenerator('card', 'dark-bg', []);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(0);
  });

  test('Should generate correct number of button variants.', () => {
    const { fixture, variants } = getFixtureAndVariants('button');
    const numberOfVariants = getNumberOfVariants(fixture.properties);
    expect(variants).toHaveLength(numberOfVariants);
  });

  test('Should generate correct button variant names', () => {
    const { variants } = getFixtureAndVariants('button');
    const variantNames = variants.map(variant => variant.name);
    expect(variantNames).toContain('button/light-bg/main/primary/default');
    expect(variantNames).toContain('button/light-bg/warning/secondary/disabled');
    expect(variantNames).toContain('button/light-bg/cta/nested/default');
  });

  test('Should generate correct number of (single) alert variants.', () => {
    const fixture = componentFixture['alert'];
    const variants = singleVariantGenerator(fixture.basename, fixture.theme, fixture.properties);
    const numberOfVariants = getNumberOfSingleVariants(fixture.properties);
    expect(variants).toHaveLength(numberOfVariants);
    expect(variants[0].name).toBe('alert/light-bg/error/default');
    expect(variants[2].name).toBe('alert/light-bg/bla/default');
  });

  test('Should generate correct variants with numbers as property values.', () => {
    const { fixture, variants } = getFixtureAndVariants('pagination');
    const numberOfVariants = getNumberOfVariants(fixture.properties);
    expect(variants).toHaveLength(numberOfVariants);
    expect(variants[0].name).toBe('pagination/light-bg/currentPage-2/maxPages-4/default');
    expect(variants[3].name).toBe('pagination/light-bg/currentPage-3/maxPages-5/default');
  });

  test('Should generate single variants or combine properties depending on \'combinedVariants\' property.', () => {
    const fixture = componentFixture['alert'];
    const component = {
      component: fixture.basename,
      members: fixture.properties,
      combinedVariants: false,
    } as Component;
    const singleResult = mutateVariants(component, 'dark-bg');
    const singleVariants = getNumberOfSingleVariants(fixture.properties);
    expect(singleResult).toHaveLength(singleVariants);
    expect(singleResult[4].name).toBe('alert/dark-bg/meh/default');

    component.combinedVariants = true;
    const combinationResult = mutateVariants(component, 'dark-bg');
    const combinedVariants = getNumberOfVariants(fixture.properties);
    expect(combinationResult).toHaveLength(combinedVariants);
    expect(combinationResult[0].name).toBe('alert/dark-bg/error/bla/default');
    expect(combinationResult[5].name).toBe('alert/dark-bg/warning/meh/default');
  });
});

function getFixtureAndVariants(name) {
  const fixture = componentFixture[name];
  const variants = variantCombinationGenerator(
    fixture.basename,
    fixture.theme,
    fixture.properties,
  );
  return {
    fixture,
    variants,
  };
}

function getNumberOfVariants(properties) {
  const numbersOfProperties = properties.map(prop => prop.value.length);
  return numbersOfProperties.reduce((a, b) => a * b, 1);
}

function getNumberOfSingleVariants(properties) {
  const numbersOfProperties = properties.map(prop => prop.value.length);
  return numbersOfProperties.reduce((a, b) => a + b, 0);
}
