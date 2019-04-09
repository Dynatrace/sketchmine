import { copyFile, createDir, delDir, Logger, writeJSON } from '@sketchmine/node-helpers';
import { generateSketchFile } from './generate-sketch-file';
import { Document, Meta, Page } from '@sketchmine/sketch-file-format';
import { dirname, resolve, basename, join } from 'path';
import chalk from 'chalk';

const log = new Logger();

export class Sketch {
  private static TMP_PATH = resolve('_sketch_tmp');
  private _outDir: string;
  private _fileName: string;
  libraryId: string;

  constructor(
    public previewImage: string,
    outFile?: string,
  ) {
    this._outDir = dirname(outFile) || './';
    this._fileName = basename(outFile, '.sketch') || 'dt-asset-lib';
  }

  /**
   * Generates and writes the Sketch file based on given pages,
   * a created document- and meta-object.
   * @param pages - Sketch pages.
   * @returns – The document's object ID of the newly created Sketch file.
   */
  async write(pages: Page[]): Promise<string> {
    const doc = this.generateDocument(pages);
    const meta = new Meta(pages);

    await this.generateFolderStructure(pages, doc, meta);
    await generateSketchFile(this._outDir, this._fileName, Sketch.TMP_PATH);

    return doc.getObjectId();
  }

  /**
   * Cleans the _tmp folder
   */
  cleanup() {
    delDir(Sketch.TMP_PATH);
  }

  /**
   * Create Folder structure for the .sketch File Format
   */
  prepareFolders() {
    delDir(Sketch.TMP_PATH);
    createDir(Sketch.TMP_PATH);
    createDir(join(Sketch.TMP_PATH, 'pages'));
    createDir(join(Sketch.TMP_PATH, 'previews'));
    createDir(join(Sketch.TMP_PATH, 'images'));
  }

  /**
   * Generates a new document and sets the library ID when already defined.
   * @param pages – Sketch pages.
   * @returns The generated document.
   */
  private generateDocument(pages: Page[]): Document {
    log.debug(chalk`\n\n\t{yellow ——— GENERATING DOCUMENT ———}\n`);
    if (!!this.libraryId) {
      log.debug(chalk`Library ID {greenBright ${this.libraryId}} already exists and is reused.`);
      return new Document(pages, this.libraryId);
    }
    log.debug('Library is new, ID is generated.');
    return new Document(pages);
  }

  /**
   * Generates a Folder in the Sketchapp open file format hierarchy.
   * from the given pages with the meta
   *
   * @param pages Page[]
   * @param doc Document
   * @param meta Meta
   */
  private async generateFolderStructure (pages: Page[], doc: Document, meta: Meta) {
    if (process.env.DEBUG === 'true') {
      console.log(chalk`\n\n\t{yellow ——— GENERATING FOLDER STRUCTURE ———}\n`);
    }
    this.prepareFolders();
    await writeJSON(join(Sketch.TMP_PATH, 'document'), doc.generateObject());
    await writeJSON(join(Sketch.TMP_PATH, 'meta'), meta.generateObject());
    await writeJSON(join(Sketch.TMP_PATH, 'user'), {});

    pages.forEach(async (page) => {
      await writeJSON(join(Sketch.TMP_PATH, 'pages', page.objectID), page.generateObject());
    });

    await copyFile(this.previewImage, join(Sketch.TMP_PATH, 'previews'));
  }
}
