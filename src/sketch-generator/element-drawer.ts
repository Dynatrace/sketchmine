import { Style } from '@sketch-draw/models/style';
import { Rectangle } from '@sketch-draw/models/rectangle';
import { boundingClientRectToBounding, calcPadding } from '@sketch-draw/helpers/util';
import { IRectangle, IRectangleOptions, IStyle, IGroup, IBounding } from '@sketch-draw/interfaces';
import { Group } from '@sketch-draw/models/group';
import {
  ITraversedDomElement,
  ITraversedDomTextNode,
  ITraversedDomSvgNode,
  ITraversedDomImageNode,
} from '../dom-traverser/traversed-dom';
import { Text } from '@sketch-draw/models/text';
import chalk from 'chalk';
import { ShapeGroup } from '@sketch-svg-parser/models/shape-group';
import { SvgParser } from '@sketch-svg-parser/svg-parser';
import { SvgToSketch } from '@sketch-svg-parser/svg-to-sketch';
import { Bitmap } from '@sketch-draw/models/bitmap';
import { Logger } from '@utils';

const log = new Logger();

export class ElementDrawer {
  private _layers = [];

  get layers(): IGroup[] { return this._layers; }

  constructor(element: ITraversedDomElement | ITraversedDomTextNode | ITraversedDomSvgNode) {
    if (!element) {
      return;
    }
    switch (element.tagName) {
      case 'TEXT':
        this.generateText(element as ITraversedDomTextNode);
        break;
      case 'IMG':
        this.generateIMG(element as ITraversedDomImageNode);
        break;
      case 'SVG':
        this.generateSVG(element as ITraversedDomSvgNode);
        break;
      default:
        this.generate(element as ITraversedDomElement);
    }
  }

  private generateIMG(element: ITraversedDomImageNode) {
    log.debug(chalk`\tAdd Image 🖼\t{grey ${element.src}}`);
    const size = this.getSize(element);
    const image = new Bitmap(size);
    image.src = element.src;
    image.name = element.name;
    this._layers.push(image.generateObject());
  }

  private generateSVG(element: ITraversedDomSvgNode) {
    log.debug(chalk`\tAdd SVG 🖼 ...`);
    const size = this.getSize(element);
    const svgObject = SvgParser.parse(element.html, size.width, size.height);
    // svgObject.shapes.map(shape => overrideSvgStyle(shape.style, element.styles));
    // const styles = this.addStyles(element);

    const svg = new SvgToSketch(svgObject);
    svg.styles = element.styles;

    this._layers.push(...svg.generateObject());
  }

  /**
   * Creates text layer for sketch but skips empty Text nodes
   * @param {ITraversedDomTextNode} element Text node from the traversed dom
   */
  private generateText(element: ITraversedDomTextNode) {
    if (!element || element.text.trim().length === 0) {
      return;
    }
    if (!element.styles) {
      return;
    }
    const bcr = boundingClientRectToBounding(element.parentRect);
    const paddedBCR = element.styles ? calcPadding(element.styles.padding, bcr) : bcr;

    if (process.env.DEBUG) {
      console.log(chalk`\tAdd Text 📝  with Text: "{yellowBright ${element.text}}"`, paddedBCR);
    }
    const text = new Text(paddedBCR, element.styles);
    text.text = element.text;
    this._layers.push(text.generateObject());
  }

  private generate(element: ITraversedDomElement) {

    if (
      element.isHidden ||
      !element.hasOwnProperty('children') &&
      element.styles === null
      ) {
      log.debug(chalk`Element {cyan ${element.tagName}.${element.className}} has no visual state.`);
      return;
    }

    const size = this.getSize(element);
    const group = new Group(size);
    group.name = element.className || element.tagName.toLowerCase();

    // add Background shape only if it has styling
    if (element.styles) {
      // shape Group in group always starts at x:0, y:0
      const shapeGroup = new ShapeGroup({ ...size, x:0, y:0 });
      shapeGroup.name = 'Background';

      shapeGroup.addRotation(element.styles.transform);
      shapeGroup.style = this.addStyles(element);
      shapeGroup.addLayer(this.addshape(element));
      group.addLayer(shapeGroup.generateObject());
    }

    if (element.children && element.children.length > 0) {
      element.children.reverse().forEach((child) => {
        const childNode = new ElementDrawer(child as any);
        const layers = childNode.layers;
        if (layers.length > 0) {
          group.addLayer(layers);
        }
      });
    }
    this._layers.push(group.generateObject());
  }

  private addshape(element: ITraversedDomElement): IRectangle {

    const options: IRectangleOptions = {
      width: element.boundingClientRect.width,
      height: element.boundingClientRect.height,
      cornerRadius: parseInt(element.styles.borderRadius, 10),
    };
    const rectangle = new Rectangle(options);
    return rectangle.generateObject();
  }

  private addStyles(element: ITraversedDomElement): IStyle {
    const style = new Style();
    const cs = element.styles;

    if (!cs) {  return; }
    if (cs.backgroundColor) { style.addColorFill(cs.backgroundColor); }
    if (cs.borderWidth) { style.addBorder(cs.borderColor, parseInt(cs.borderWidth, 10)); }
    if (parseInt(cs.opacity, 10) < 1) { style.opacity = cs.opacity; }

    return style.generateObject();
  }

  private getSize(element: ITraversedDomElement | ITraversedDomSvgNode): IBounding {
    const parentBCR = element.parentRect;
    const bcr = element.boundingClientRect;

    if (process.env.DEBUG && element.className) {
      console.log(
        chalk`\t{magentaBright ${element.className}} | {yellowBright ${element.tagName}}`,
        boundingClientRectToBounding(element.boundingClientRect),
      );
    }

    /** root elemenet has no parentBCR */
    if (parentBCR && Object.keys(parentBCR).length > 0) {
      const x = bcr.x - parentBCR.x;
      const y = bcr.y - parentBCR.y;
      return {
        height: Math.round(bcr.height),
        width: Math.round(bcr.width),
        x: Math.round(x),
        y: Math.round(y),
      };
    }
    return boundingClientRectToBounding(element.boundingClientRect);
  }
}
