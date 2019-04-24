import { SketchAnimaPadding } from './padding';

export interface SketchAnimaLayout {
  kModelPropertiesKey: SketchAnimaLayoutProperties;
}

export type SketchAnimaLayoutProperty = SketchAnimaPadding;

export interface SketchAnimaLayoutProperties {
  padding?: SketchAnimaPadding;
}

export * from './padding';
export * from './types';
