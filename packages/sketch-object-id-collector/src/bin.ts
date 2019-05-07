import { displayHelp } from '@sketchmine/node-helpers';
import { ObjectIdMapping } from './interfaces';
import { main } from './main';

const helpText = `
  This package is used to collect object IDs from a previous library build
  to preserve IDs of symbols and overrides.
`;

const cmdFlags = [
  {
    flags: ['h', 'help'],
    text: 'displays the help page 📓',
  },
  {
    flags: ['file'],
    text: 'path to the previous library build',
  },
  {
    flags: ['outFile'],
    text: 'optional path to a json file to store the output of the collector',
  },
];

export async function commandLineExecutor(): Promise<number> {
  const args = require('minimist')(process.argv.slice(2));

  if (args.help || args.h) {
    displayHelp(helpText, cmdFlags);
    return 0;
  }

  if (!args.file) {
    throw new Error('An input file to parse is required.');
  }

  const objectIdMapping: ObjectIdMapping = await main(args.file, args.outFile);
  if (objectIdMapping) {
    return 0;
  }
  return 1;
}

commandLineExecutor().catch((err) => {
  console.error(err.message);
  process.exit(1);
})
.then((code: number) => {
  process.exit(code);
});
