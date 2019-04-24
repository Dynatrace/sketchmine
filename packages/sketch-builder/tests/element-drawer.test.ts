// tslint:disable:max-line-length
import { ElementDrawer } from '../src/element-drawer';
import { ITraversedDomElement } from '@sketchmine/dom-agent';
import { SketchObjectTypes } from '@sketchmine/sketch-file-format';
import { StyleDeclaration } from '@sketchmine/helpers';

describe('[sketch-builder] › draw sketch elements', () => {
  let baseTraversedElement: ITraversedDomElement;

  beforeEach(() => {
    baseTraversedElement = {
      tagName: 'DT-ALERT',
      className: 'dt-alert-error',
      parentRect: null,
      boundingClientRect: { x: 0, y: 0, width: 800, height: 44, top: 0, right: 800, bottom: 44, left: 0 } as DOMRect,
      styles: null,
      isHidden: false,
    } as ITraversedDomElement;
  });

  test('draw lines for borderTop and borderLeft', () => {
    baseTraversedElement.tagName = 'DIV',
    baseTraversedElement.className = 'dt-alert-text-container',
    baseTraversedElement.parentRect = { x: 0, y: 0, width: 800, height: 44, top: 0, right: 800, bottom: 44, left: 0 } as DOMRect,
    baseTraversedElement.boundingClientRect = { x: 36, y: 0, width: 764, height: 44, top: 0, right: 800, bottom: 44, left: 36 } as DOMRect,
    baseTraversedElement.styles = new StyleDeclaration();
    baseTraversedElement.styles.borderLeft = '1px solid rgb(196, 20, 37)';
    baseTraversedElement.styles.borderTop = '1px solid rgb(196, 20, 37)';

    const el = new ElementDrawer(new Map());
    el.drawNode(baseTraversedElement);
    expect(el.layers).toBeInstanceOf(Array);
    expect(el.layers).toHaveLength(1);
    const group = el.layers[0];
    expect(group._class).toMatch(SketchObjectTypes.Group);
    expect(group.style).not.toHaveProperty('borders');
    expect(group).toHaveProperty('layers');
    expect(group.layers).toBeInstanceOf(Array);
  });
});
