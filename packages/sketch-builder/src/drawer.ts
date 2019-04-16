import {
  Artboard,
  boundingClientRectToBounding,
  IBounding,
  Page,
  SymbolMaster,
} from '@sketchmine/sketch-file-format';
import {
  ITraversedDomElement,
  TraversedLibrary,
  TraversedPage,
  TraversedSymbol,
} from '@sketchmine/dom-agent';
import { Logger } from '@sketchmine/node-helpers';
import { ElementDrawer } from './element-drawer';
import chalk from 'chalk';
import { ObjectIdMapping } from './interfaces';
import { getObjectId, setObjectId } from './helpers';

const log = new Logger();
const SYMBOL_ARTBOARD_MARGIN: number = 40;
const MAX_SYMBOLS_VERTICAL_ALIGNED: number = 20;

interface LastSymbol extends IBounding {
  name: string;
  component: string;
}

export interface Symbol {
  symbol: TraversedSymbol;
  size: IBounding;
}

export interface SymbolsPage {
  size: IBounding;
  symbols: Symbol[];
}

/**
 * Sort the symbols in a matrix according to same component grouping
 * @param symbols
 */
function sortSymbols(symbols: TraversedSymbol[]): SymbolsPage {
  let lastSymbol: LastSymbol;
  let stacked = 0;
  const matrix: Symbol[] = [];
  const pageSize: IBounding = { height: 0, width: 0, x: 0, y: 0 };

  for (let i = 0, max = symbols.length; i < max; i += 1) {
    const symbol = symbols[i];
    const element = symbol.symbol;
    const size = boundingClientRectToBounding(element.boundingClientRect);
    const component = symbol.name.split('/')[0];

    if (i === 0) {
      size.x = 0;
      size.y = 0;
      pageSize.height += size.height;
      pageSize.width += size.width;
    } else if (component === lastSymbol.component) {
      if (stacked >= MAX_SYMBOLS_VERTICAL_ALIGNED) {
        size.x += SYMBOL_ARTBOARD_MARGIN / 2 + lastSymbol.x + lastSymbol.width;
        pageSize.width += SYMBOL_ARTBOARD_MARGIN + size.width;
        stacked = 0;
      } else {
        size.y += SYMBOL_ARTBOARD_MARGIN + lastSymbol.y + lastSymbol.height;
        size.x = lastSymbol.x;
        pageSize.height += SYMBOL_ARTBOARD_MARGIN + size.height;
        stacked += 1;
      }
    } else {
      const margin = SYMBOL_ARTBOARD_MARGIN * 2;
      size.x += margin + lastSymbol.x + lastSymbol.width;
      pageSize.width += margin + size.width;
      stacked = 0;
    }
    lastSymbol = { name: symbol.name, component, ...size };
    matrix.push({  size, symbol });
  }

  return { size: pageSize, symbols: matrix };
}

export class Drawer {

  // Map of Symbols that are drawn with name and id
  drawnSymbols = new Map<string, string>();
  idMapping: ObjectIdMapping;

  drawSymbols(library: TraversedLibrary): Page {
    const symbolsPage = sortSymbols(library.symbols as TraversedSymbol[]);
    const page = new Page(symbolsPage.size);

    for (let i = 0, max = symbolsPage.symbols.length; i < max; i += 1) {
      const size = symbolsPage.symbols[i].size;
      const symbol: TraversedSymbol = symbolsPage.symbols[i].symbol;

      log.debug(chalk`\n💎\t{greenBright Draw new Symbol in library}: ${symbol.name}`);

      const symbolMaster = new SymbolMaster(size);
      symbolMaster.name = symbol.name;

      // Update symbol's objectId according to given id-mapping file
      if (!!this.idMapping) {
        const storedObjectId = getObjectId(symbolMaster.name, this.idMapping);
        if (!!storedObjectId) {
          // tslint:disable-next-line max-line-length
          log.debug(chalk`Symbol {greenBright ${symbolMaster.name}} already exists, objectID {greenBright ${storedObjectId}} is reused.`);
          symbolMaster.objectID = storedObjectId;
        } else {
          // tslint:disable-next-line max-line-length
          log.debug(chalk`Symbol {greenBright ${symbolMaster.name}} is new, objectID {greenBright ${symbolMaster.objectID}} is generated.`);
          this.idMapping = setObjectId(symbolMaster.name, symbolMaster.objectID, this.idMapping);
        }
      }

      if (symbol.symbol) {
        symbolMaster.layers = this.drawElements(symbol.symbol);
      }

      this.drawnSymbols.set(symbolMaster.name, symbolMaster.objectID);
      page.addLayer(symbolMaster.generateObject());
    }
    return page;
  }

  drawPage(htmlPage: TraversedPage): Page {
    const element = htmlPage.element as ITraversedDomElement;
    const { height, width, x, y } = element.boundingClientRect;
    const bounding = { height, width, x, y } as IBounding;
    const page = new Page(bounding);
    const ab = new Artboard(bounding);
    page.name = htmlPage.pageUrl;
    ab.name = htmlPage.pageTitle;

    if (element.children) {
      for (let i = 0, max = element.children.length; i < max; i += 1) {
        ab.layers.push(...this.drawElements(element.children[i] as ITraversedDomElement));
      }
    }

    page.addLayer(ab.generateObject());
    return page;
  }

  private drawElements(element: ITraversedDomElement) {
    const node = new ElementDrawer(element, this.drawnSymbols);
    return [...node.layers];
  }
}
