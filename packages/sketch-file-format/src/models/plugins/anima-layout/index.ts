import {
  SketchAnimaLayoutProperty,
  SketchAnimaLayout,
  SketchAnimaLayoutTypes,
} from '../../../interfaces';

export class AnimaLayout {

  /** The plugin identifier in the userInfo object (is the key for the plugin configuration) */
  static pluginIdentifier = 'com.animaapp.stc-sketch-plugin';
  /** properties that can be set on the object */
  private properties: SketchAnimaLayoutProperty[] = [];

  // addPaddedGroup()

  /** Generates the sketch object that is rendered in the JSON output */
  generateObject(): SketchAnimaLayout{

    return {
      kModelPropertiesKey: {
        padding: {
          bottom: 7,
          model_class: SketchAnimaLayoutTypes.padding,
          left: 16,
          model_version: 0.1,
          modelID: 'viewPadding_319cadbe-82e7-4798-9658-718d63635026',
          top: 7,
          right: 16,
        },
      },
    };
  }
}

// export class AnimaPadding {


//   generateObject(): SketchAnimaPadding {
//     return {
//       model_class: SketchAnimaLayoutTypes.padding,
//       left
//     }
//   }
// }
