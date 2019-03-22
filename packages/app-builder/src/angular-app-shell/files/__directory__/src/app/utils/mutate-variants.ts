import { Component, Method, Property } from '@sketchmine/code-analyzer';
import { generateVariantName } from './generate-variant-name';

export function mutateVariants(component: Component, theme: string) {
  const baseName = component.component;
  const members = component.members.filter(m => m.type === 'property') as Property[];
  const result = component.combinedVariants
    ? variantCombinationGenerator(baseName, theme, members)
    : singleVariantGenerator(baseName, theme, members);

  return result;
}

export function singleVariantGenerator(baseName: string, theme: string, variants: Property[]): any[] {
  const result = [];
  for (let i = 0, max = variants.length; i < max; i += 1) {
    const variant = variants[i];

    for (let j = 0, l = variant.value.length; j < l; j += 1) {
      const value = variant.value[j];
      if (value && value !== 'undefined') {
        const change = [{
          type: variant.type,
          key: variant.key,
          value,
        }];

        result.push({
          name: generateVariantName(baseName, theme, change),
          changes: change,
        });
      }
    }
  }
  return result;
}

/**
 * Takes a set of properties and generates all possible property value combinations.
 * How the property values are sorted is not relevant.
 * @param baseName - Component base name (e.g. "button").
 * @param theme - Theme property (e.g. "light-bg").
 * @param properties - Array of properties.
 * @return – An array of ...
 */
export function variantCombinationGenerator(baseName: string, theme: string, properties: Property[]): any[] {
  if (!properties || !Array.isArray(properties) || !properties.length) {
    return [];
  }
  const result = [];
  const lastPropertyIndex = properties.length - 1;

  function helper(changes: any[], i: number) {
    const property = properties[i];
    const noOfPropertyValues = property.value.length;

    for (let j = 0; j < noOfPropertyValues; j += 1) {
      const value = property.value[j];
      const newChanges = changes.slice(0); // clone arr

      if (value) {
        newChanges.push({
          type: property.type,
          key: property.key,
          value,
        });
      }
      if (i === lastPropertyIndex) {
        if (newChanges.length) {
          result.push({
            name: generateVariantName(baseName, theme, newChanges),
            changes: newChanges,
          });
        }
      } else {
        helper(newChanges, i + 1);
      }
    }
  }

  helper([], 0);
  return result.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
}
