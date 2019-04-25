import { Component, Library } from '@sketchmine/code-analyzer';
import { ITraversedElement, TraversedLibrary, TraversedPage, TraversedSymbol } from '@sketchmine/dom-agent';
import { Logger, readFile } from '@sketchmine/node-helpers';
import { Sketch } from '@sketchmine/sketch-file-builder';
import chalk from 'chalk';
import { exec } from 'child_process';
import { resolve } from 'path';
import puppeteer from 'puppeteer';
import { sketchGeneratorApi } from './builder-api';
import { SketchBuilderConfig } from './config.interface';
import { Drawer } from './drawer';
import { ObjectIdService } from './object-id-service';

declare const window: any;
const log = new Logger();
const objectIdService = new ObjectIdService();

/**
 * For debugging reasons the result of the dom Traverser can be stored in a file,
 * then the traversing in the browser gets skiped and uses the result from the json.
 */
const LOCAL_RESULT_PATH = resolve('tests/fixtures/library.json');

export class ElementFetcher {
  // private _assetHsandler: AssetHandler = new AssetHandler();
  result: (TraversedPage | TraversedLibrary)[] = [];

  constructor(public conf: SketchBuilderConfig, public meta?: Library) {}

  async generateSketchFile(): Promise<number> {
    this.sortSymbols();
    const drawer = new Drawer();
    const sketch = new Sketch(
      this.conf.previewImage || 'assets/preview.png',
      this.conf.outFile,
    );

    // Set library ID for the newly created library file
    if (!!this.conf.library) {
      sketch.libraryId = objectIdService.getLibraryId();
    }

    const pages = [];
    let symbolsMaster = drawer.drawSymbols({ symbols: [] } as any);

    if (this.result.length > 0) {
      this.result.forEach((result) => {
        switch (result.type) {
          case 'page':
            pages.push(drawer.drawPage(result));
            break;
          case 'library':
            symbolsMaster = drawer.drawSymbols(this
              .result[0] as TraversedLibrary);
            break;
        }
      });
    }

    // TODO: add asset handler
    // if (this.hasAssets()) {
    //   sketch.prepareFolders();
    //   await this.downloadAssets();
    // }
    await sketch.write([symbolsMaster, ...pages]);
    sketch.cleanup();

    if (process.env.SKETCH === 'open-close') {
      exec(`open ${this.conf.outFile}`);
    }
    return 0;
  }

  /**
   * Checks if there are assets in the symbols
   * @returns boolean
   */
  // private hasAssets(): boolean {
  //   return this._result.some(res => res.some(symbol => Object.keys(symbol.assets).length > 0));
  // }

  /**
   * Download all Assets for all pages to the folder
   */
  // private async downloadAssets() {
  //   this._assetHandler.clean();
  //   if (process.env.DEBUG) {
  //     console.log(chalk`\n📷\t{blueBright Downloading images}:`);
  //   }
  //   const assets = this._symbols.map(symbol => this._assetHandler.download(symbol.assets));
  //   await Promise.all(assets);
  // }

  /**
   * this function sorts the Symbols according to the way they are nested to ensure every symbol that
   * is going to be reused is drawn before being reused.
   */
  sortSymbols() {
    const sorted = [];
    const lib = this.result.find(
      page => page.type === 'library',
    ) as TraversedLibrary;

    if (!lib) {
      return;
    }

    for (let i = 0, max = lib.symbols.length; i < max; i += 1) {
      const comp = lib.symbols[i];
      const componentName = comp.name.split('/')[0];
      let compPos = sorted.indexOf(componentName);

      // if component does not exist just add it.
      if (compPos < 0) {
        sorted.push(componentName);
        // of course update the index because old is wrong
        compPos = sorted.indexOf(componentName);
      }

      if (!comp.hasNestedSymbols.length) {
        continue;
      }

      comp.hasNestedSymbols.forEach((symbol) => {
        // TODO: @lukas.holzer make this more efficient
        const comp: Component = Object.values(this.meta.components).find(
          (comp: Component) => comp.selector.includes(symbol),
        );
        const pos = sorted.indexOf(comp.component);

        // if nested component is not in the order list
        // add it before element
        if (pos < 0) {
          sorted.splice(compPos, 0, comp.component);
        } else if (pos > -1) {
          // now check if it is before parent component
          // if parent component is before component shuffle...
          if (pos > compPos) {
            // remove component from behind parent
            sorted.splice(pos, 1);
            // add component before parent
            sorted.splice(compPos, 0, comp.component);
          }
        }
      });
    }

    // sort the symbols according to the sorted array
    lib.symbols.sort(
      (a: TraversedSymbol, b: TraversedSymbol): number => {
        return (
          sorted.indexOf(a.name.split('/')[0]) -
          sorted.indexOf(b.name.split('/')[0])
        );
      },
    );
  }

  async getPage(
    browser: puppeteer.Browser,
    url: string,
  ): Promise<TraversedPage | TraversedLibrary> {
    console.log('SKETCH-BUILDER: getPage');
    const traverser = await readFile(this.conf.agent);
    let result: any;

    if (this.conf.library) {
      console.log('SKETCH-BUILDER: library await sketchGeneratorApi');
      result = await sketchGeneratorApi({
        browser,
        url,
        rootSelector: this.conf.rootElement,
        traverser,
        metaInformation: this.meta,
      });
    } else {
      const page = await browser.newPage();
      page.setViewport(this.conf.chrome.defaultViewport);
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.addScriptTag({ content: traverser });
      await page.addScriptTag({
        content: `
          window.page = {
            type: 'page',
            pageUrl: window.location.pathname.substr(1),
            pageTitle: document.title,
            assets: [], //images.assets,
            element: null,
          };
          const hostElement = document.querySelector('${
            this.conf.rootElement
          }');
          if (!hostElement) {
            throw new Error(\`Could not select hostElement with selector: ${
              this.conf.rootElement
            }\`);
          }
          const visitor = new window.DomVisitor(hostElement, []);
          const traverser = new window.DomTraverser();
          window.page.element = traverser.traverse(hostElement, visitor);`,
      });
      result = (await page.evaluate(() => window.page)) as ITraversedElement[];
    }
    if (result.element === null) {
      throw new Error(
        'Something happened while traversing the DOM! check the dom-agent! 🧙🏻‍♂',
      );
    }
    console.log('SKETCH-BUILDER: end of Get page');
    log.debug(JSON.stringify(result), 'dom-traverser');
    return result;
  }

  async fetchElements() {
    if (
      process.env.TRAVERSER &&
      process.env.TRAVERSER.includes('skip-traverser')
    ) {
      const result = JSON.parse(await readFile(LOCAL_RESULT_PATH));
      this.result.push(result);
      return;
    }

    const options = process.env.DOCKER
      ? {
        ...this.conf.chrome,
          /**
           * shared memory space 64MB. Cause chrome to crash when rendering large pages
           * @see https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips
           */
        args: ['--disable-dev-shm-usage', '--no-sandbox'],
        executablePath: '/usr/bin/chromium-browser',
      }
      : {
        ...this.conf.chrome,
        headless: process.env.DEBUG ? false : true,
        devtools: process.env.DEBUG ? true : false,
      };
    const browser = await puppeteer.launch(options);
    const host = new URL(this.conf.url);
    const confPages = this.conf.pages || [host.pathname];

    for (let i = 0, max = confPages.length; i < max; i += 1) {
      const page = confPages[i].startsWith('/') ? confPages[i] : `/${confPages[i]}`;
      const url = host.protocol !== 'file:' ? `${host.origin}${page}` : host.href;

      log.debug(chalk`🛬\t{cyanBright Fetching Page}: ${url}`);
      this.result.push(await this.getPage(browser, url));
    }

    await browser.close();
  }
}
