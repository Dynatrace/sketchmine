import {
  SketchDocument,
  SketchPage,
  IBounding,
  SketchBase,
  SketchObjectTypes,
  SketchSymbolMaster,
  SketchText,
} from '@sketchmine/sketch-file-format';
import { ObjectIdMapping } from './interfaces';

export class ObjectIdCollector {
  collection: ObjectIdMapping;

  constructor(document: SketchDocument) {
    this.collection = {
      libraryId: document.do_objectID,
      symbols: {},
    };
  }

  collect(pages: SketchPage[]): void {
    pages.forEach(page => this.collectIDs(page));
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

    // Collect text overrides
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
          text: (element as SketchText).attributedString.string,
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
