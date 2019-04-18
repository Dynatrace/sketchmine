import { zipToBuffer as unzip } from '@sketchmine/node-helpers';
import { ObjectIdCollector } from './object-id-collector';
import { ObjectIdMapping } from './interfaces';

export async function main(libraryFile: string): Promise<ObjectIdMapping> {

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

    const objectIdCollector = new ObjectIdCollector(document, pages);
    objectIdCollector.makeCollection();

    return objectIdCollector.collection;
  });
}
