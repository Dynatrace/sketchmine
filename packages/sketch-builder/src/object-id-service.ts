import { ObjectIdMapping, TextObjectOverrideProperty } from '@sketchmine/sketch-object-id-collector';
import { Text } from '@sketchmine/sketch-file-format';

interface UsedObjectOverrideProperty extends TextObjectOverrideProperty {
  _used: boolean;
}

/**
 * The object Id service holds an objectIdMapping object during the library build.
 * The sketch builder uses this collection of object Ids as reference and reuses
 * IDs when they have already been generated on a previous library build.
 */
export class ObjectIdService {
  private static instance: ObjectIdService;
  collection: ObjectIdMapping;
  /**
   * When drawing layers of a symbolMaster its name is needed as a key
   * to store all override properties to the correct object.
   * This value is set by the drawSymbols function of the drawer instance.
   */
  currentSymbolMaster: string;

  constructor() {
    if (ObjectIdService.instance) { return ObjectIdService.instance; }
    ObjectIdService.instance = this;
  }

  /**
   * Gets the objectID of the given symbol.
   * @param symbolKey – The symbol's name, e.g. "button/light-bg/main/primary/default".
   * @returns The symbol's objectID or undefined if there is none.
   */
  getObjectId(symbolKey: string): string | undefined {
    if (this.collection && this.collection.symbols && this.collection.symbols[symbolKey]) {
      return this.collection.symbols[symbolKey].objectId;
    }
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
  }

  getTextOverrideId(node: Text): string | undefined {
    let objectId = node.objectID;
    const overrideProperties = this.collection.symbols[this.currentSymbolMaster].overrides;

    if (!overrideProperties.length) {
      return objectId;
    }

    const filteredProperties = overrideProperties
      .filter((property: UsedObjectOverrideProperty) => !property._used);

    // Compare text content to match objectId
    let textMatch = false;
    for (let i = 0; i < filteredProperties.length; i = i + 1) {
      const property = filteredProperties[i] as UsedObjectOverrideProperty;
      if (property.text && property.text === node.text) {
        objectId = property.objectId;
        property._used = true;
        textMatch = true;
        break;
      }
    }

    if (textMatch) {
      return objectId;
    }

    (filteredProperties[0] as UsedObjectOverrideProperty)._used = true;
    return filteredProperties[0].objectId;

    // TODO: for a better ID match calculate absolute position
    // of the element in the Sketch file and compare the distance values.

  }
}
