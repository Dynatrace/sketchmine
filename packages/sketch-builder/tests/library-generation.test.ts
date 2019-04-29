import { createDir, delDir, readFile } from '@sketchmine/node-helpers';
import { SketchDocument, SketchObjectTypes, SketchPage } from '@sketchmine/sketch-file-format';
import { getObjectIdMapping } from '@sketchmine/sketch-object-id-collector';
import { accessSync } from 'fs';
import cloneDeep from 'lodash/cloneDeep';
import { dirname, join, resolve } from 'path';
import { promisify } from 'util';
import { SketchBuilderConfig } from '../src/config.interface';
import { ElementFetcher } from '../src/element-fetcher';
import { ObjectIdService } from '../src/object-id-service';

const config: SketchBuilderConfig = {
  // metaInformation: resolve('tests', 'fixtures', 'meta-information.json'),
  agent: require.resolve('@sketchmine/dom-agent'),
  url: `file:///${resolve('tests', 'fixtures', 'basic-symbols.html')}`,
  rootElement: 'ng-component > *',
  outFile: resolve('./tests/_tmplib/sketch-library.sketch'),
  previewImage: 'assets/preview.png',
  library: {
    app: 'some/path/to/an/app',
  },
};

const secondConfig = cloneDeep(config);
secondConfig.outFile = resolve('./tests/_tmplib/sketch-library-new.sketch');
secondConfig.library.prevBuild = resolve('./tests/_tmplib/sketch-library.sketch');

const extract = promisify(require('extract-zip'));

describe('[sketch-builder] › Library generation › Generate a library based on a previous build.', () => {
  const fileName = 'sketch-library';
  const secondFileName = 'sketch-library-new';
  const testTmp = dirname(config.outFile);
  const objectIdService = new ObjectIdService();
  let document: SketchDocument;
  let documentNew: SketchDocument;
  let page: SketchPage;
  let pageNew: SketchPage;

  beforeAll(async () => {
    delDir(testTmp);
    createDir(testTmp);
    // Generate a Sketch library file, without a previous library.
    const elementFetcher = new ElementFetcher(config);
    await elementFetcher.fetchElements();
    await elementFetcher.generateSketchFile();
    await extract(config.outFile, { dir: join(testTmp, fileName) });

    // Generate a second Sketch library file, with a previous library given.
    const elementFetcher2 = new ElementFetcher(secondConfig);
    // Get the object IDs from the previous library build.
    objectIdService.collection = await getObjectIdMapping(secondConfig.library.prevBuild);

    await elementFetcher2.fetchElements();
    await elementFetcher2.generateSketchFile();
    await extract(secondConfig.outFile, { dir: join(testTmp, secondFileName) });

    // Get documents & pages
    document = JSON.parse(await readFile(resolve(testTmp, fileName, 'document.json')));
    documentNew = JSON.parse(await readFile(resolve(testTmp, secondFileName, 'document.json')));
    const pageID = document.pages[0]._ref.replace('pages\/', '');
    const pageIDnew = documentNew.pages[0]._ref.replace('pages\/', '');
    page = JSON.parse(await readFile(resolve(testTmp, fileName, 'pages', `${pageID}.json`)));
    pageNew = JSON.parse(await readFile(resolve(testTmp, secondFileName, 'pages', `${pageIDnew}.json`)));
  });

  afterAll(() => {
    delDir(testTmp);
  });

  test('Generates two Sketch library files.', () => {
    let filesExist;
    try {
      accessSync(config.outFile);
      accessSync(secondConfig.outFile);
      filesExist = true;
    } catch {
      filesExist = false;
    }
    expect(filesExist).toBeTruthy();
  });

  test('Both generated libraries have the same ID.', async () => {
    expect(document.do_objectID).toBe(documentNew.do_objectID);
  });

  test('When two symbols have the same ID, they must also have the same name.', () => {
    const oldSymbolMasters = {};
    page.layers.forEach((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        oldSymbolMasters[layer.do_objectID] = layer.name;
      }
    });
    const mismatches = pageNew.layers.map((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        // If previous and new symbol IDs match, but the current symbol name
        // is not equivalent to the previous one, the test should fail.
        const prevName = oldSymbolMasters[layer.do_objectID];
        if (prevName && prevName !== layer.name) {
          return `${prevName} -> ${layer.name}`;
        }
        return '';
      }
    }).filter(m => m.length > 0).join(', ');

    try {
      expect(mismatches).toHaveLength(0);
    } catch {
      throw new Error(`The following symbols have the same ID but different names: ${mismatches}`);
    }
  });

  test('When two symbols have the same name, they must also have the same ID.', () => {
    const oldSymbolMasters = {};
    page.layers.forEach((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        oldSymbolMasters[layer.name] = layer.do_objectID;
      }
    });
    const mismatches = pageNew.layers.map((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        // If previous and new symbol names match, but the current symbol ID
        // is not equivalent to the previous one, the test should fail.
        const prevID = oldSymbolMasters[layer.name];
        if (prevID && prevID !== layer.do_objectID) {
          return `${prevID} -> ${layer.do_objectID}`;
        }
        return '';
      }
    }).filter(m => m.length > 0).join(', ');

    try {
      expect(mismatches).toHaveLength(0);
    } catch {
      throw new Error(`The following symbols have the same name but different IDs: ${mismatches}`);
    }
  });

  test('The changeIdentifier value is increased when a new library is built.', () => {
    const changeIdentifiers = {};
    page.layers.forEach((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        changeIdentifiers[layer.do_objectID] = layer.changeIdentifier;
      }
    });

    const failures = pageNew.layers.map((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        const prevChangeIdentifier = changeIdentifiers[layer.do_objectID];
        if (prevChangeIdentifier && prevChangeIdentifier >= layer.changeIdentifier) {
          // tslint:disable-next-line:max-line-length
          return `${layer.do_objectID} (${layer.name}): old value ${prevChangeIdentifier} – new value ${layer.changeIdentifier}`;
        }
        return '';
      }
    }).filter(m => m.length > 0).join(', ');

    try {
      expect(failures).toHaveLength(0);
    } catch {
      throw new Error(`The change identifier values of the following symbols are wrong: ${failures}`);
    }
  });

  test('The objectID and the symbolID of each symbolMaster must match.', () => {
    const failuresPrevBuild = page.layers.map((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        if (layer.do_objectID !== layer.symbolID) {
          return `objectID: ${layer.do_objectID} - symbolID: ${layer.symbolID}`;
        }
        return '';
      }
    }).filter(m => m.length > 0).join(', ');

    const failuresNewBuild = pageNew.layers.map((layer) => {
      if (layer._class === SketchObjectTypes.SymbolMaster) {
        if (layer.do_objectID !== layer.symbolID) {
          return `objectID: ${layer.do_objectID} - symbolID: ${layer.symbolID}`;
        }
        return '';
      }
    }).filter(m => m.length > 0).join(', ');

    try {
      expect(failuresPrevBuild).toHaveLength(0);
      expect(failuresNewBuild).toHaveLength(0);
    } catch {
      // tslint:disable-next-line:max-line-length
      throw new Error(`The following symbols' objectID and symbolID values don't match: ${failuresPrevBuild}, ${failuresNewBuild}`);
    }
  });
});
