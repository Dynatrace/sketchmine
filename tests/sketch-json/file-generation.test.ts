import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as extractZip from 'extract-zip';

import { delDir, createDir } from '@utils';
import { fileValidations } from './file-validations';
import { ElementFetcher } from '../../src/ng-sketch/element-fetcher';

const extract = promisify(extractZip);

describe('➡ Sketch File generation 💎', () => {
  const fileName = 'dt-asset-lib';
  const testTmp = path.resolve('./tests/_tmp');
  const sketchFile = path.join(testTmp, `${fileName}.sketch`);

  beforeAll(async () => {
    delDir(testTmp);
    createDir(testTmp);
    const elementFetcher = new ElementFetcher();
    elementFetcher.host = `file://${path.resolve(__dirname, '..', 'fixtures', 'test-page.html')}`;
    await elementFetcher.generateSketchFile([''], testTmp);
    await extract(sketchFile, { dir: path.join(testTmp, fileName) });
  });

  describe('File structure:', () => {

    it('Generating .sketch file.', () => {
      expect(fs.existsSync(sketchFile)).toBeTruthy();
    });

    it('Filestructure contain all files', () => {
      expect(fs.existsSync(path.resolve(testTmp, fileName, 'user.json'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(testTmp, fileName, 'meta.json'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(testTmp, fileName, 'document.json'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(testTmp, fileName, 'previews', 'preview.png'))).toBeTruthy();
    });
  });

  describe('JSON validation: 🚧 \n', () => {
    // general File Validations
    fileValidations();

    describe('Validating modules: 🛠 \n', () => {
    });
  });

  afterAll(() => {
    delDir(testTmp);
  });

});
