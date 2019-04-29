import { readFile, accessSync } from 'fs';
import { resolve } from 'path';
import { ObjectIdMapping } from '../src/interfaces';
import { delDir, createDir } from '@sketchmine/node-helpers';
import { main as getObjectIdMapping } from '../src/main';

const TMP_FOLDER = resolve('./tests/_tmp/');
const LIBRARY_NAME = 'library-fixture';
const MAPPING_NAME = 'id-mapping-fixture';
const LIBRARY_FIXTURE = resolve(`./tests/fixtures/${LIBRARY_NAME}.sketch`);
const ID_MAPPING_FIXTURE = resolve(`./tests/fixtures/${MAPPING_NAME}.json`);
const OUT_FILE = resolve(TMP_FOLDER, 'id-mapping-out.json');

describe('[sketch-object-id-collector] › Collect IDs from Sketch file.', () => {
  let idMappingFixture: ObjectIdMapping;
  let idMapping: ObjectIdMapping;

  beforeAll(async (done) => {
    delDir(TMP_FOLDER);
    createDir(TMP_FOLDER);
    // Get all object IDs from given Sketch library (i.e. run the object ID collector).
    idMapping = await getObjectIdMapping(LIBRARY_FIXTURE);

    readFile(ID_MAPPING_FIXTURE, { encoding: 'utf-8' }, (err, data: string) => {
      if (!err) {
        idMappingFixture = JSON.parse(data);
        done();
      } else {
        console.log(`Failed reading ${MAPPING_NAME}.json\n`, err.message);
      }
    });
  });

  afterAll(() => {
    delDir(TMP_FOLDER);
  });

  test('Sets library ID correctly.', () => {
    expect(idMapping.libraryId).toBe(idMappingFixture.libraryId);
  });

  test('Generates correct number of symbols.', () => {
    const noOfSymbols = Object.keys(idMapping.symbols).length;
    expect(noOfSymbols).toBe(21);
  });

  test('Gets all relevant symbol properties.', () => {
    const symbolNames = Object.keys(idMapping.symbols);
    const firstSymbol = idMapping.symbols[symbolNames[0]];
    expect(firstSymbol).toHaveProperty('objectId');
    expect(firstSymbol).toHaveProperty('changeIdentifier');
    expect(firstSymbol).toHaveProperty('overrides');
  });

  test('Gets correct symbol IDs', () => {
    Object.keys(idMapping.symbols).forEach((key) => {
      expect(idMappingFixture.symbols[key].objectId).toBe(idMapping.symbols[key].objectId);
    });
  });

  test('Gets correct number of overrides.', () => {
    const btnKey = 'button\/light-bg\/main\/primary\/default';
    const cardKey = 'card\/light-bg\/default';
    expect(idMapping.symbols[btnKey].overrides).toHaveLength(1);
    expect(idMapping.symbols[btnKey].overrides[0]).toHaveProperty('text');
    expect(idMapping.symbols[btnKey].overrides[0].text).toBe('Simple button');
    expect(idMapping.symbols[cardKey].overrides).toHaveLength(4);
  });

  test('Creates a JSON output file when a path is given.', async () => {
    // Run the object ID collector with an output file.
    await getObjectIdMapping(LIBRARY_FIXTURE, OUT_FILE);
    let fileExists;
    try {
      accessSync(OUT_FILE);
      fileExists = true;
    } catch {
      fileExists = false;
    }
    expect(fileExists).toBeTruthy();
  });
});
