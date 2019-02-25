import { ParsedVisitor, ParseResult } from '../parsed-nodes';
import { ReferenceResolver } from './reference-resolver';
import { JSONResolver } from './json-resolver';

export function applyTransformers<T>(parsedResults: Map<string, ParseResult>): Map<string, T> {
  let metaInformation = parsedResults;
  // we need the results array to provide it to the reference resolver
  // in case that we look for root nodes in there
  const results = Array.from(parsedResults.values());

  // list of transformers that should be applied to the
  // parsed results
  const transformers: ParsedVisitor[] = [
    new ReferenceResolver(results),
    new JSONResolver(),
  ];

  /** applies the transformers on the AST */
  for (const transformer of transformers) {
    const transformedResults = new Map<string, ParseResult>();
    metaInformation.forEach((result, fileName) => {
      transformedResults.set(fileName, result.visit(transformer));
    });
    metaInformation = transformedResults;
  }

  return metaInformation as Map<string, T & any>;
}