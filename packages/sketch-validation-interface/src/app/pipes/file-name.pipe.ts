import { Pipe, PipeTransform } from '@angular/core';

const enum FormatVariables {
  Path = '#path',
  Filename = '#filename',
  Ending = '#ending',
}

const REGEX = new RegExp(/^\/(.+\/)*(.+)\.(.+)$/);

@Pipe({
  name: 'fileName',
})
export class FileNamePipe implements PipeTransform {

  /**
   *
   * @param value full path where the filename should be extracted
   * @param format `"#path/#filename.#ending"`
   * format is passed as string 3 variables can be used:
   *  - `#path`: all before the filename
   *  - `#filename`: the filename
   *  - `#ending`: the file ending
   */
  transform(value: string, format?: string): string {
    return fileName(value, format);
  }

}

export function fileName(value: string, format?: string): string {
  try {
    const res = REGEX.exec(value);

    if (format) {
      return format
        .replace(FormatVariables.Path, res[1])
        .replace(FormatVariables.Filename, res[2])
        .replace(FormatVariables.Ending, res[3]);
    }
    return res[2];
  } catch {
    return value;
  }
}
