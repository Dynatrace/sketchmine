import { ObjectIdMapping } from './interfaces';
import { main } from './main';

export async function commandLineExecutor(): Promise<number> {
  const args = require('minimist')(process.argv.slice(2));

  // TODO: provide help
  // if (args.help || args.h) {
  //   displayHelp();
  //   return 0;
  // }

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
