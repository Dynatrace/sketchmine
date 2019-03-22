export interface ObjectIdMapping {
  version: string;
  symbols: { [key: string]: ObjectIdMappingSymbol };
  symbolAliases?: { [key: string]: string };
}

export interface ObjectIdMappingSymbol {
  objectId: string;
}
