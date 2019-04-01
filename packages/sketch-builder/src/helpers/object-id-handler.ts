import { ObjectIdMapping } from '../interfaces';

// TODO: what about default aliases? button == button/main == button/main/primary...

/**
 * Gets the object_ID of the given symbol.
 * @param symbolName – The symbol's name, e.g. "button/light-bg/main/primary/default".
 * @param objectIdMapping – The idMapping object.
 * @returns The symbol's object_ID or undefined if there is none.
 */
export function getObjectId(symbolName: string, objectIdMapping: ObjectIdMapping): string | undefined {
  let objectId;
  if (objectIdMapping && objectIdMapping.symbols && objectIdMapping.symbols[symbolName]) {
    objectId = objectIdMapping.symbols[symbolName].objectId;
  }
  return objectId;

  // TODO: what about if name partes are sorted differently?
}

/**
 * Sets the object_ID of the given symbol.
 * @param symbolName – The symbol's name, e.g. "button/light-bg/main/primary/default".
 * @param objectId - The newly generated object_ID.
 * @param objectIdMapping – The idMapping object.
 * @returns The updated idMapping object.
 */
export function setObjectId(symbolName: string, objectId: string, objectIdMapping: ObjectIdMapping): ObjectIdMapping {
  const newObjectIdMapping = Object.assign({}, objectIdMapping);

  if (Object.keys(newObjectIdMapping).length < 1) {
    // TODO: get the correct version number here & update version on each generation!
    newObjectIdMapping.version = '0.0.0';
    newObjectIdMapping.symbols = {};
  }

  newObjectIdMapping.symbols[symbolName] = {
    objectId,
  };

  return newObjectIdMapping;
}

/**
 * @param objectIdMapping - The idMapping object.
 * @returns the library ID when given in the idMapping object, undefined else.
 */
export function getLibraryId(objectIdMapping: ObjectIdMapping) {
  if (objectIdMapping && objectIdMapping.libraryId) {
    return objectIdMapping.libraryId;
  }

  return;
}
