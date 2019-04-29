import { SketchMeta, SketchMetaArtboard, SketchPagesAndArtboards } from '../interfaces';
import { Page } from './page';

export class Meta {
  private static _version = 105;
  private static _compatVersion = 99;
  private static _appVersion = '51.3';
  private static _appUrl = 'com.bohemiancoding.sketch3';
  private static _commit = 'a9a8e0cffcaebe58914746cb1ab8f707ba873565';
  private static _variant = 'NONAPPSTORE';
  private static _fonts = ['BerninaSans'];
  private static _build = 57544;
  private _pages = [];

  constructor(pages: Page[]) {
    this._pages = [...pages];
  }

  private addArtboards(page: Page): { [key: string]: SketchMetaArtboard } {
    const artboards = {};
    page.layers.forEach((layer) => {
      artboards[layer.do_objectID] = {
        name: layer.name,
      };
    });
    return artboards;
  }

  private addPagesAndArtboards(): { [key: string]: SketchPagesAndArtboards } {
    const artboards = {};
    this._pages.forEach((page: Page) => {
      artboards[page.objectID] = {
        name: page.name,
        artboards: this.addArtboards(page),
      };
    });

    return artboards as { [key: string]: SketchPagesAndArtboards };
  }

  generateObject(): SketchMeta {
    return {
      commit: Meta._commit,
      pagesAndArtboards: this.addPagesAndArtboards(),
      version: Meta._version,
      fonts: Meta._fonts,
      compatibilityVersion: Meta._compatVersion,
      app: Meta._appUrl,
      autosaved: 0,
      variant: Meta._variant,
      created: {
        commit: Meta._commit,
        appVersion: Meta._appVersion,
        build: Meta._build,
        app: Meta._appUrl,
        compatibilityVersion: Meta._compatVersion,
        version: Meta._version,
        variant: Meta._variant,
      },
      saveHistory: [
        `${Meta._variant}.${Meta._build}`,
      ],
      appVersion: Meta._appVersion,
      build: Meta._build,
    };
  }
}
