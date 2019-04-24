import { UUID, StyleDeclaration } from '@sketchmine/helpers';
import {
  ITraversedDomSvgNode,
  ITraversedDomImageNode,
  ITraversedDomTextNode,
  ITraversedDomElement,
  Visitor,
} from './public-api';

/**
 * The property keys that are used to identify if the element
 * has default styling behaviors for the background.
 * uses the values from `new StyleDeclaration()`.
 */
const DEFAULT_STYLING_VALUES = [
  'backgroundColor',
  'backgroundImage',
  'borderWidth',
  'boxShadow',
  'padding',
];

type elementNode = HTMLElement | SVGSVGElement | HTMLImageElement;

export interface StyleOptions {
  styles: StyleDeclaration;
  isHidden: boolean;
  hasDefaultStyling: boolean;
}

function hasAutoWidth(element: Element) {
  const initialWidth = element.getBoundingClientRect().width;
  // create ghost element
  const ghost = document.createElement('b');
  ghost.style.display = 'inline-block';
  ghost.style.height = '1px';
  ghost.style.width = '1px';
  ghost.style.padding = '0';
  ghost.style.margin = '0';

  element.appendChild(ghost);
  const updatedWidth = element.getBoundingClientRect().width;
  element.removeChild(ghost);

	return updatedWidth > initialWidth;
}


/**
 * @description
 * The visitor visits a node and pulls the information out that is later needed
 * for the .sketch file generation.
 */
export class DomVisitor implements Visitor {

  hasNestedSymbols = [];
  constructor(public hostElement: HTMLElement, public selectors: string[]) {}

  visitElement(element: elementNode): ITraversedDomElement {
    const isRoot = element === this.hostElement;
    const className = this.getClassName(element).join('\/');
    const tagName = element.tagName.toUpperCase();
    const parent = element.parentElement;
    const parentRect: DOMRect | null = (parent && !isRoot)
      ? this.getRect(parent as HTMLElement)
      : null;
    const options = this.getStyle(element);
    const matchingComponent = this.selectors.find(sel => element.webkitMatchesSelector(sel)) || null;

    if (matchingComponent && !isRoot) {
      this.hasNestedSymbols.push(matchingComponent);
    }


    const el = {
      tagName,
      className,
      parentRect,
      boundingClientRect: this.getRect(element as HTMLElement),
      styles: !options.hasDefaultStyling && !options.isHidden ? options.styles : null,
      matchingComponent,
      variant: matchingComponent ? element.getAttribute('symbol-variant') : null,
      isHidden: options.isHidden,
      autoLayout: {
        autoWidth: hasAutoWidth(element),
      },
    } as ITraversedDomElement;

    switch (tagName) {
      case 'SVG':
        (el as ITraversedDomSvgNode).html = element.outerHTML;
        el.styles = options.styles;
        break;
      case 'PATH':
        el.styles = options.styles;
        break;
      case 'IMG':
        const src = element.getAttribute('src');
        const id = UUID.generate();
        (el as ITraversedDomImageNode).src = `images/${id}.${src.split('.').pop()}`;
        (el as ITraversedDomImageNode).name = src;
        /** TODO: make image asset helper a singleton */
        // images.addAsset(src, id);
        break;
    }

    return el;
  }

  /**
   * Gathers information about a Textnode
   * @param text TextNode
  */
  visitText(text: Node): ITraversedDomTextNode {
    /**
     * filter empty text nodes with linebreaks
     */
    const content = text.textContent.replace(/\n/gm, '');
    if (content.trim().length === 0) {
      return null;
    }
    const options = this.getStyle(text.parentNode as elementNode);
    return {
      tagName: 'TEXT',
      parentRect: this.getRect(text.parentNode as HTMLElement),
      styles: !options.isHidden ? options.styles : null,
      isHidden: options.isHidden,
      text: text.textContent,
    };
  }

  /** Returns the classes of an HTMLElement as an array with strings */
  getClassName(element: Element): string[] {
    return (typeof element.className === 'string')
      ? element.className.split(' ')
      : [];
  }

  /**
   * returns a DOMRect from an element
   * @param element HTMLElement
   */
  getRect(element: HTMLElement): DOMRect {
    const bcr = element.getBoundingClientRect() as DOMRect;
    /**
     * In case of we return the result with `.evaluate` properties of DOM object
     * are not enumerable and won't get serialized so we have to manual assign them.
     * @example https://github.com/segmentio/nightmare/issues/723#issuecomment-232666629
     * */
    return {
      x: bcr.x,
      y: bcr.y,
      width: bcr.width,
      height: bcr.height,
      top: bcr.top,
      right: bcr.right,
      bottom: bcr.bottom,
      left: bcr.left,
    } as DOMRect;
  }

  isHidden(style: StyleDeclaration) {
    if (style.visibility === 'hidden' || style.display === 'none') {
      return true;
    }
    return false;
  }

  /**
   * Gathers the CSS Style Declaration of an Element
   * @param element Element
   * @param textNode boolean that checks if it is a textnode (for default styling ignore on text node)
   * @returns StyleDeclaration or null if it has default styling
   */
  getStyle(element: elementNode): StyleOptions {
    const defaultStyling = new Set<boolean>();
    const styles = new StyleDeclaration();
    const tempStyle = getComputedStyle(element);
    for (const key of Object.keys(styles)) {
      defaultStyling.add(DEFAULT_STYLING_VALUES.includes(key) && styles[key] !== tempStyle[key]);
      styles[key] = tempStyle[key];
    }

    return {
      styles,
      isHidden: this.isHidden(styles),
      hasDefaultStyling: defaultStyling.size < 2,
    };
  }
}
