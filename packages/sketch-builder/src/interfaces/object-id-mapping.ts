import { IBounding } from '@sketchmine/sketch-file-format';
export interface ObjectIdMapping {
  version: string;
  symbols: { [key: string]: ObjectIdMappingSymbol };
  symbolAliases?: { [key: string]: string };
  libraryId?: string;
}

export interface ObjectIdMappingSymbol {
  objectId: string;
  changeIdentifier: number;
  overrides?: ObjectOverrideProperties[];
}

export interface ObjectOverrideProperties {
  objectId: string;
  className: string;
  bounding: IBounding;
  distance?: number;
  used?: boolean;
}
