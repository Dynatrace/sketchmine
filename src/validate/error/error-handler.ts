import { ValidationError, ColorNotInPaletteError, FileNameError } from './validation-error';
import chalk from 'chalk';
import { IErrorHandler } from '../interfaces/error-handler.interface';
import { IValidationRule } from '../interfaces/validation-rule.interface';
import { Logger } from '@utils';

const log = new Logger();

export class ErrorHandler {

  private static instance: ErrorHandler;
  private _rulesStack: IErrorHandler.RulesStack = {};
  private _colors: Set<string> = new Set();

  // Singelton pattern Constructor returning instance if it exists
  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }
    ErrorHandler.instance = this;
  }

  destroy() {
    this._rulesStack = {};
    this._colors = new Set();
  }

  addError(rule: IValidationRule, error: ValidationError) {
    if (this._rulesStack.hasOwnProperty(rule.name)) {
      this._rulesStack[rule.name].failing.push(error);
      return;
    }
    this._rulesStack[rule.name] = {
      succeeding: 0,
      failing: [error],
      description: rule.description,
    };
  }

  addSuccess(rule: IValidationRule) {
    if (this._rulesStack.hasOwnProperty(rule.name)) {
      this._rulesStack[rule.name].succeeding += 1;
      return;
    }
    this._rulesStack[rule.name] = {
      succeeding: 1,
      failing: [],
      description: rule.description,
    };
  }

  emit() {
    let throwingError: ValidationError; // save one Error to throw for exit code
    let stackedOutput = ``;

    for (const rule in this._rulesStack) {
      if (!this._rulesStack.hasOwnProperty(rule)) {
        continue;
      }
      const element = this._rulesStack[rule];

      if (element.failing.length === 0) {
        stackedOutput += chalk`\n\n{green ✔︎ ${rule}} {grey — passed ${element.succeeding.toString()} times.}\n`;
      } else {
        throwingError = element.failing[0];
        stackedOutput += chalk`\n\n{redBright ✘ ${rule} — failed ${element.failing.length.toString()} times!}\n`;
        if (element.description) {
          stackedOutput += chalk`{grey   ${element.description}}\n`;
        }

        if (process.env.DEBUG) {
          this.tracedFailings(element.failing);
        }

        if (this._colors.size > 0) {
          stackedOutput += this.colorPaletteError();
        }

      }
    }

    if (throwingError) {
      log.debug(chalk`\n{red 🚨 ––––––––––––––––––––––––––––––––––––––––––––––––––––––– 🚨}\n`);
    }

    log.notice(stackedOutput);

    if (throwingError) {

      log.error(chalk`{redBright The Error occured in the Object with the id: ${throwingError.objectId}} ` +
        chalk`{red ${throwingError.name}}\n`);

      throw throwingError;
    }
  }

  private colorPaletteError(): string {
    let output = chalk`{grey There are {white ${this._colors.size.toString()} Colors} used, }` +
    chalk`{grey that are not in the color palette:\n\n}`;
    if (process.env.VERBOSE) {
      Array.from(this._colors).forEach(color => output += chalk`{hex('${color}') ███} ${color}  `);
      output += '\n\n';
    }
    this._colors.clear();
    return output;
  }

  private tracedFailings(failings: ValidationError[]) {
    for (let i = 1, max = failings.length; i <= max; i += 1) {
      const item = failings[i - 1];
      if (item instanceof FileNameError) {
        console.log(
          chalk`{redBright ${i.toString()}) ${item.constructor.name}} → in Folder ${item.name} with filename: \n` +
          chalk`{red ${item.objectId}}\n` +
          chalk`${item.message}\n`,
        );
        continue;
      }
      const trace = (item.parents.artboard) ? item.parents.artboard : item.parents.symbolMaster;
      console.log(
        chalk`{redBright ${i.toString()}) ${item.constructor.name}} → {grey ${item.parents.page} → ${trace}}\n` +
        chalk`{red ${item.objectId}} — ${item.name}\n` +
        chalk`${item.message}\n`,
      );

      if (item instanceof ColorNotInPaletteError) {
        this._colors.add(item.color);
      }
    }
  }
}
