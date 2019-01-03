import { ElementFetcher } from './element-fetcher';
import { SketchBuilderConfig } from './config.interface';
import { exec } from 'child_process';
import { Result as MetaResult } from '@sketchmine/code-analyzer';
import ora from 'ora';
import chalk from 'chalk';

/**
 * @description the main entry point of this package
 * @param {SketchBuilderConfig} config The Object from the configuration file
 * @param {MetaResult | undefined} meta optional the meta information from the code-analyzer can be passed to
 * detect symbols from the library.
 * @returns {number} process exit code: 0 if everything went alright and the file was generated.
 */
export async function main(config: SketchBuilderConfig, meta?: MetaResult | undefined): Promise<number> {
  /**
   * If the process environment variable `SKETCH` is set
   * with open-close it will close and after creating the file automatically open
   * Sketch with the created file.
   * Nice feature if you develop and want to see the result immediately.
   */
  if (process.env.SKETCH === 'open-close') {
    exec(`osascript -e 'quit app "Sketch"'`);
  }

  const spinner = ora(chalk`Start scraping the provided site {grey ${config.url}} ⛏\n`).start();
  const elementFetcher = new ElementFetcher(config, meta);
  /**
   * starts the headless chrome to collect all the information from the provided site.
   * can be skipped for development purpose.
   * for that the process environment TRAVERSER has to includes **skip-traverser**.
   * if that variable is set it will fallback to a .json fixture located in the test fixtures under
   * `./tests/fixtures/library.json` that represents a development fixture from the fetcher.
   */
  await elementFetcher.fetchElements();
  // generates the .sketch file from the information that was provided from the `collectElements()` function.
  spinner.text = 'Start writing your Sketch file 💎\n';
  const exitCode = await elementFetcher.generateSketchFile();
  spinner.stop();
  return exitCode;
}
