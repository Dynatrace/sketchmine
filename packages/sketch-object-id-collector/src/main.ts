import { Logger, writeJSON, zipToBuffer as unzip } from '@sketchmine/node-helpers';
import chalk from 'chalk';
import { ObjectIdMapping } from './interfaces';
import { ObjectIdCollector } from './object-id-collector';
import { SketchDocument, SketchPage } from '@sketchmine/sketch-file-format';

const log = new Logger();

/**
 * Analyzes a given Sketch file and collects all symbolMaster object IDs.
 * @param libraryFile - The Sketch file that should be analyzed.
 * @param inMemory – Whether the collection should be processed in memory or stored to a JSON file.
 * @param collectionPath - The path to the JSON output file the collection should be saved to.
 */
export async function main(libraryFile: string, outFile?: string): Promise<ObjectIdMapping> {

  // Unzip all the pages and the document.json file of the given Sketch file
  return unzip(libraryFile, /(document\.json|pages\/.*?\.json)/).then(async (result) => {
    let document;
    const pages = [];

    await result.forEach((jsonFile) => {
      const content = jsonFile.buffer.toString();
      if (jsonFile.path === 'document.json') {
        document = content;
      } else {
        pages.push(content);
      }
    });

    // tslint:disable-next-line:max-line-length
    log.debug(chalk`{cyanBright Start ID collection}: Collecting object IDs of all symbols of an existing Sketch file.`);

    let sketchDocument: SketchDocument;
    let sketchPages: SketchPage[] = [];

    try {
      sketchDocument = JSON.parse(document);
      sketchPages = pages.map(page => JSON.parse(page));
    } catch {
      throw new Error('Sketch Object ID Collector says: Parsing of Sketch json files failed.');
    }

    const objectIdCollector = new ObjectIdCollector(sketchDocument);
    objectIdCollector.collect(sketchPages);

    if (outFile) {
      await writeJSON(outFile, objectIdCollector.collection, true);
    }

    return objectIdCollector.collection;
  });
}
