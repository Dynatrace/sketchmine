import { IBounding } from '@sketchmine/sketch-file-format';
export interface ObjectIdMapping {
  symbols: { [key: string]: ObjectIdMappingSymbol };
  symbolAliases?: { [key: string]: string };
  libraryId?: string;
}

export interface ObjectIdMappingSymbol {
  objectId: string;
  changeIdentifier: number;
  overrides: TextObjectOverrideProperty[];
}

export interface ObjectOverrideProperty {
  objectId: string;
  bounding: IBounding;
}

export interface TextObjectOverrideProperty extends ObjectOverrideProperty {
  text: string;
}
