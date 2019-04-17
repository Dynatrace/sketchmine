import { SketchBase, SketchObjectTypes, SketchSymbolMaster, IBounding } from '@sketchmine/sketch-file-format';
import { ObjectIdMapping } from './interfaces';

export class ObjectIdCollector {
  collection: ObjectIdMapping;
  private _document;
  private _pages = [];

  constructor(documentFile: string, pages: string[]) {
    this._document = JSON.parse(documentFile);
    pages.forEach(page => this._pages.push(JSON.parse(page)));
  }

  makeCollection(): void {
    this.collection = {
      version: '0.0.0', // TODO: get Angular components version here
      libraryId: this._document.do_objectID,
      symbols: {},
    };
    this._pages.forEach(page => this.collectIDs(page));
  }

  private collectIDs(element: SketchBase, symbolMasterName?: string): void {
    let symbolKey = symbolMasterName;

    // Start with pages
    if (element._class === SketchObjectTypes.Page) {
      return element.layers.forEach(layer => this.collectIDs(layer));
    }

    // Collect symbols masters
    if (element._class === SketchObjectTypes.SymbolMaster) {
      symbolKey = element.name;
      this.collection.symbols[symbolKey] = {
        objectId: element.do_objectID,
        changeIdentifier: (element as SketchSymbolMaster).changeIdentifier,
        overrides: [],
      };
    } else {
      if (!symbolKey) {
        return;
      }
    }

    // Collect overrides
    if (element._class === SketchObjectTypes.Text && symbolKey) {
      if (this.collection.symbols[symbolKey]) {
        const textBounding: IBounding = {
          height: element.frame.height,
          width: element.frame.width,
          x: element.frame.x,
          y: element.frame.y,
        };
        this.collection.symbols[symbolKey].overrides.push({
          objectId: element.do_objectID,
          bounding: textBounding,
          className: element._class,
        });
      }
    }

    if (element.layers && element.layers.length > 0) {
      element.layers.forEach(layer => this.collectIDs(layer, symbolKey));
    } else {
      return;
    }
  }
}
