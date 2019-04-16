export interface ObjectIdMapping {
  version: string;
  symbols: { [key: string]: ObjectIdMappingSymbol };
  symbolAliases?: { [key: string]: string };
  libraryId?: string;
}

export interface ObjectIdMappingSymbol {
  objectId: string;
  changeIdentifier: number;
}
