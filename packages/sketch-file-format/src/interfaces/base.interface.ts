import { SketchStyle } from './style.interface';
import { SketchForeignTextStyles } from './text-style.interface';

export enum SketchObjectTypes {
  Artboard = 'artboard',
  AttributedString = 'attributedString',
  Bitmap = 'bitmap',
  Blur = 'blur',
  Border = 'border',
  Color = 'color',
  CurvePoint = 'curvePoint',
  Document = 'document',
  ExportOptions = 'exportOptions',
  Fill = 'fill',
  FontDescriptor = 'fontDescriptor',
  Frame = 'rect',
  Gradient = 'gradient',
  GradientStop = 'gradientStop',
  GraphicsContext = 'graphicsContextSettings',
  Group = 'group',
  InnerShadow = 'innerShadow',
  Oval = 'oval',
  OverrideValue = 'overrideValue',
  Page = 'page',
  ParagraphStyle = 'paragraphStyle',
  Path = 'path',
  Polygon = 'polygon',
  Rectangle = 'rectangle',
  RulerData = 'rulerData',
  Shadow = 'shadow',
  ShapeGroup = 'shapeGroup',
  ShapePath = 'shapePath',
  StringAttribute = 'stringAttribute',
  Style = 'style',
  SymbolInstance = 'symbolInstance',
  SymbolMaster = 'symbolMaster',
  Text = 'text',
  TextStyle = 'textStyle',
  Triangle = 'triangle',
}

export interface SketchBase {
  _class: SketchObjectTypes;
  do_objectID: string;
  exportOptions: SketchExportOptions;
  foreignTextStyles?: SketchForeignTextStyles[];
  frame?: SketchFrame;
  hasClickThrough?: boolean;
  isFlippedHorizontal: boolean;
  isFlippedVertical: boolean;
  isLocked: boolean;
  isVisible: boolean;
  layerListExpandedType: number;
  layers?: any[];
  name: string;
  nameIsFixed: boolean;
  originalObjectID?: string;
  resizingConstraint: number;
  resizingType: number;
  rotation: number;
  shouldBreakMaskChain: boolean;
  userInfo?: { [key: string]: any; };
  style: SketchStyle;
}

export interface SketchClippingMask { // shape-group.interface has to extend from that as well
  clippingMaskMode: number;
  hasClippingMask: boolean;
}

export interface SketchFrame extends IBounding {
  _class: SketchObjectTypes.Frame;
  constrainProportions: boolean;
  do_objectID?: string; // used in Group
}

export interface SketchExportOptions {
  _class: SketchObjectTypes.ExportOptions;
  exportFormats: any[];
  includedLayerIds: any[];
  layerOptions: number;
  shouldTrim: boolean;
}

export interface IBounding {
  height: number;
  width: number;
  x: number;
  y: number;
}
