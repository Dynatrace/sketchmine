export interface SketchBuilderConfig {
  agent?: string; // path to the dom-agent that should be injected
  chrome?: Chrome;
  url: string;
  library?: Library;
  metaInformation?: string;
  outFile: string;
  pages?: string[];
  previewImage?: string;
  rootElement?: string;
}

export interface Library {
  app: string;
  objectIdMapping?: string;
  version?: string;
}

export interface DefaultViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

export interface Chrome {
  defaultViewport: DefaultViewport;
}
