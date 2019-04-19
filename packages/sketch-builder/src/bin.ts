import { main } from './main';
import { parseCommandlineArgs } from './cli';
import { readFile } from '@sketchmine/node-helpers';
import { Library } from '@sketchmine/code-analyzer';
import { join } from 'path';

const DEFAULT_AGENT = require.resolve('@sketchmine/dom-agent');
const DEFAULT_PREVIEW = join(__dirname, '..', 'assets', 'preview.png');

/**
 * @description The CLI entry point. You need to provide a `config.json` with all
 * the necessary configuration.
 * @returns {number} process exit code.
 */
export async function commandLineExecutor(): Promise<number> {
  const args = process.argv.slice(2);
  const defaultConfig = {
    agent: DEFAULT_AGENT,
    previewImage: DEFAULT_PREVIEW,
    rootElement: 'body',
    chrome: {
      defaultViewport: {
        width: 1200,
        height: 600,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: false,
      },
    },
  };

  const loadedConfig = await parseCommandlineArgs(args);
  const config = { ...defaultConfig, ...loadedConfig };

  // the meta option is optional in the main function
  let meta: Library;

  /**
   * you can provide the meta information, it will be used to detect
   * symbols from the library to reference them in the sketch file instead of redrawing
   * the same symbol twice.
  */
  if (config.metaInformation) {
    meta = JSON.parse(await readFile(config.metaInformation));
  }
  return await main(config, meta) as number;
}

/** Call the main function with command line args */
commandLineExecutor()
.then((code: number) => {
  process.exit(code);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
