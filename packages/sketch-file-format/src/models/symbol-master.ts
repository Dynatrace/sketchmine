import { Base } from './base';
import { SketchBase, IBounding, SketchObjectTypes, SketchSymbolMaster } from '../interfaces';
import { Style } from './style';
import { addBackgroundColor } from './artboard';

export class SymbolMaster extends Base {
  changeIdentifier = 1;

  constructor(bounding: IBounding) {
    super(bounding);
    super.className = SketchObjectTypes.SymbolMaster;
    super.breakMaskChain = true;
    super.style = new Style().generateObject();
  }

  generateObject(): SketchSymbolMaster {
    const base: SketchBase = super.generateObject();
    return {
      ...base,
      frame: super.addFrame(),
      hasClickThrough: false,
      backgroundColor: addBackgroundColor(),
      hasBackgroundColor: false,
      horizontalRulerData: super.addRuler(),
      includeBackgroundColorInExport: true,
      includeInCloudUpload: true,
      isFlowHome: false,
      resizesContent: false,
      verticalRulerData: super.addRuler(),
      includeBackgroundColorInInstance: false,
      symbolID: base.do_objectID,
      changeIdentifier: this.changeIdentifier,
    };
  }
}
