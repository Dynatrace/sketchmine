import {
  Bitmap,
  boundingClientRectToBounding,
  calcPadding,
  Group,
  IBounding,
  SketchBitmap,
  SketchGroup,
  SketchRectangle,
  SketchShapeGroup,
  SketchShapePath,
  SketchSymbolInstance,
  SketchText,
  SymbolInstance,
  Text,
} from '@sketchmine/sketch-file-format';
import {
  ITraversedDomElement,
  ITraversedDomImageNode,
  ITraversedDomSvgNode,
  ITraversedDomTextNode,
} from '@sketchmine/dom-agent';
import chalk from 'chalk';
import { SvgParser, SvgToSketch } from '@sketchmine/sketch-svg-parser';
import { Logger } from '@sketchmine/node-helpers';
import { ElementStyle } from './element-style';

const log = new Logger();

type LayerElements =
  SketchGroup |
  SketchRectangle |
  SketchShapePath |
  SketchShapeGroup |
  SketchBitmap |
  SketchText |
  SketchSymbolInstance;

export class ElementDrawer {
  layers: LayerElements[] = [];

  constructor(
    element: ITraversedDomElement | ITraversedDomTextNode | ITraversedDomSvgNode,
    public drawnSymbols: Map<string, string>,
  ) {
    if (!element) { return; }
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
    this.layers.push(image.generateObject());
  }

  private generateSVG(element: ITraversedDomSvgNode) {
    log.debug(chalk`\tAdd SVG 📈  ${element.className}`);
    const size = this.getSize(element);
    const svgObject = SvgParser.parse(element.html, size.width, size.height);
    // svgObject.shapes.map(shape => overrideSvgStyle(shape.style, element.styles));
    // const styles = this.addStyles(element);

    const svg = new SvgToSketch(svgObject, size);
    svg.styles = element.styles;

    this.layers.push(...svg.generateObject());
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
    this.layers.push(text.generateObject());
  }

  private generate(element: ITraversedDomElement) {

    if (
      isHidden(element) ||
      !hasChildren(element) && !hasStyling(element)
    ) {
      log.debug(chalk`Element {cyan ${element.tagName}.${element.className}} has no visual state.`);
      return;
    }

    const size = this.getSize(element);

    if (element.matchingComponent && element.variant) {
      const symbolId = this.drawnSymbols.get(element.variant);
      const symbolInstance = new SymbolInstance(size, symbolId);
      this.layers.push(symbolInstance.generateObject());
      return;
    }

    const group = new Group(size);
    group.name = element.className || element.tagName.toLowerCase();

    if (hasStyling(element)) {
      // group resets x and y coordinates to 0
      const visualStyle = new ElementStyle(element, { ...size, x: 0, y: 0 });
      group.layers.push(...visualStyle.createElementStyle());
    }

    if (hasChildren(element)) {
      // reverse children for correct order in sketch
      element.children
      .reverse()
      .forEach((child: ITraversedDomElement | ITraversedDomTextNode | ITraversedDomSvgNode) => {
        const childNode = new ElementDrawer(child, this.drawnSymbols);
        if (childNode.layers.length) {
          group.layers.push(...childNode.layers);
        }
      });
    }
    this.layers.push(group.generateObject());
  }

  private getSize(element: ITraversedDomElement | ITraversedDomSvgNode): IBounding {
    const parentBCR = element.parentRect;
    const bcr = boundingClientRectToBounding(element.boundingClientRect);

    if (process.env.DEBUG && element.className) {
      console.log(chalk`\t{magentaBright ${element.className}} | {yellowBright ${element.tagName}}`, bcr);
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
    return bcr;
  }
}

function hasChildren(element: ITraversedDomElement): boolean {
  return element.hasOwnProperty('children') && element.children.length > 0;
}

function hasNestedChildren(element: ITraversedDomElement): boolean {
  return hasChildren(element) ? element.children.hasOwnProperty('children') : false;
}

function hasStyling(element: ITraversedDomElement): boolean {
  return element.styles !== null;
}

function isHidden(element: ITraversedDomElement): boolean {
  return element.isHidden;
}
