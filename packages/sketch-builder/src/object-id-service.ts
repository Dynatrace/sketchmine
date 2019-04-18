import { ObjectIdMapping } from './interfaces';
import { IBounding, Text } from '@sketchmine/sketch-file-format';

/**
 * The object Id service holds an objectIdMapping object during the library build.
 * The sketch builder uses this collection of object Ids as reference and reuses
 * IDs when they have already been generated on a previous library build.
 */
export class ObjectIdService {
  private static _instance: ObjectIdService;
  collection: ObjectIdMapping;
  /**
   * When drawing layers of a symbolMaster its name is needed as a key
   * to store all override properties to the correct object.
   * This value is set by the drawSymbols function of the drawer instance.
   */
  currentSymbolMaster: string;

  constructor() {
    if (ObjectIdService._instance) { return ObjectIdService._instance; }
    ObjectIdService._instance = this;
  }

  /**
   * Gets the objectID of the given symbol.
   * @param symbolKey – The symbol's name, e.g. "button/light-bg/main/primary/default".
   * @returns The symbol's objectID or undefined if there is none.
   */
  getObjectId(symbolKey: string): string | undefined {
    let objectId;
    if (this.collection && this.collection.symbols && this.collection.symbols[symbolKey]) {
      objectId = this.collection.symbols[symbolKey].objectId;
    }
    return objectId;

    // TODO: what about if name parts are sorted differently? (e.g. button/primary/main instead of button/main/primary)
  }

  /**
   * Returns the library ID of the objectID collection.
   * @returns the library ID when given in the collection object, undefined else.
   */
  getLibraryId(): string | undefined {
    if (this.collection && this.collection.libraryId) {
      return this.collection.libraryId;
    }

    return;
  }

  getTextOverrideId(node: Text): string | undefined {
    const overrideProperties = this.collection.symbols[this.currentSymbolMaster].overrides || [];
    if (overrideProperties.length) {
      const filteredProperties = overrideProperties
        .filter(property => property.className === node.className && !property.used);
      filteredProperties.forEach((property) => {
        property.distance = getBoundingDistance(property.bounding, node.bounding);
      });
      filteredProperties.sort((a, b) => a.distance - b.distance);
      filteredProperties[0].used = true;
      if (filteredProperties.length) {
        return filteredProperties[0].objectId;
      }
    }

    // TODO: do not take bounding box only for distance; there are a lot of objects with x/y both 0!
    // absolute coordinates needed

    return node.objectID;
  }
}

function getBoundingDistance(boundingA: IBounding, boundingB: IBounding): number {
  return Math.sqrt(
    Math.pow(boundingA.x - boundingB.x, 2) +
    Math.pow(boundingA.y - boundingB.y, 2),
  );
}
