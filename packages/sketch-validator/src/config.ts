import { SketchObjectTypes } from '@sketchmine/sketch-file-format';
import { IValidationRule, ValidationRequirements } from './interfaces/validation-rule.interface';
import { artboardValidation } from './rules/artboard-validation';
import { colorValidation } from './rules/color-validation';
import { pageValidation } from './rules/page-validation';
import { symbolNameValidation } from './rules/symbol-name-validation';
import { textValidation } from './rules/text-validation';

// Valid artboard sizes
export const ARTBOARD_SIZES: string[] = [
  '360',
  '1280',
  '1920',
];

// Dynatrace logo colors
export const DYNATRACE_LOGO_COLORS = [
  '#FFFFFF', // logo-white
  '#1496FF', // logo-blue
  '#6F2DA8', // logo-purple
  '#B4DC00', // logo-limegreen
  '#73BE28', // logo-green
  '#1A1A1A', // logo-dark-gray
];

// Valid text colors
export const VALID_TEXT_COLORS = [
  '#FFFFFF', // white
  '#F8F8F8', // gray-100
  '#CCCCCC', // gray-300
  '#B7B7B7', // gray-400
  '#898989', // gray-500
  '#6D6D6D', // gray-600, pagination (deselected)
  '#454646', // gray-700, text color
  '#191919', // gray-900, pagination, table
  '#00A1B2', // turquoise-600, link color
  '#00848e', // turquoise-700, link hover color
  '#DC172A', // red-500, error color
  '#C41425', // red-600, error hover color
  '#5EAD35', // green-600
  '#3F962A', // green-700
  '#14A8F5', // blue-500, chart tab (deselected)
  '#008CDB', // blue-600, chart tab (selected)
  '#DEBBF3', // purple-200, syntax highlight color
  '#9355B7', // purple-500, chart tab (deselected)
  '#7C38A1', // purple-600, chart tab (selected)
  '#526CFF', // royal-blue-500, chart tab (deselected)
  '#4556D7', // royal-blue-600, chart tab (selected)
];

export const rules: IValidationRule[] = [
  {
    selector: [SketchObjectTypes.SymbolMaster],
    name: 'symbol-name-validation',
    description: 'Check if the symbol names matche the Dynatrace Sketch naming conventions.',
    env: ['global'],
    validation: symbolNameValidation,
  },
  {
    selector: [
      SketchObjectTypes.Path,
      SketchObjectTypes.ShapePath,
      SketchObjectTypes.ShapeGroup,
      SketchObjectTypes.Oval,
      SketchObjectTypes.Polygon,
      SketchObjectTypes.Rectangle,
      SketchObjectTypes.Triangle,
      SketchObjectTypes.Artboard, // Select artboard to validate the background color
    ],
    name: 'color-palette-validation',
    description: 'Check if the used colors are in our color palette.',
    ignoreArtboards: ['full-color-palette'],
    env: ['global', 'product'],
    validation: colorValidation,
    options: {
      dynatraceLogoColors: DYNATRACE_LOGO_COLORS,
      colors: '', // gets overriden by run function on node.js and otherwise by sketch plugin
      requirements: [
        ValidationRequirements.Style,
        ValidationRequirements.BackgroundColor,
      ],
    },
  },
  {
    selector: [SketchObjectTypes.Artboard],
    name: 'artboard-validation',
    description: 'Check if the artboard names and sizes are valid and if artboards are not empty.',
    env: ['product'],
    validation: artboardValidation,
    includePages: ARTBOARD_SIZES,
    options: {
      requirements: [ValidationRequirements.LayerSize, ValidationRequirements.Frame],
    },
  },
  {
    selector: [SketchObjectTypes.Page],
    name: 'page-validation',
    description: 'Check if all pages have a valid name, contain artboards and if the symbols page is valid.',
    env: ['product'],
    validation: pageValidation,
    options: {
      artboardSizes: ARTBOARD_SIZES,
      requirements: [ValidationRequirements.Children],
    },
  },
  {
    selector: [SketchObjectTypes.Text],
    name: 'text-validation',
    description: 'Check if only valid font families, colors and sizes are used.',
    env: ['product'],
    validation: textValidation,
    includePages: ARTBOARD_SIZES,
    options: {
      requirements: [
        ValidationRequirements.AttributedString,
        ValidationRequirements.Style,
      ],
      VALID_TEXT_COLORS,
    },
  },
];
