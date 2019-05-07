![Github banner for sketchmine](https://dt-cdn.net/images/github-banner-2x-1777-2b23e499af.png)

# @sketchmine/sketch-object-id-collector

The Sketch object ID collector gets a Sketch (library) file and collects IDs of the following Sketch objects:
- the file itself (the ID of the document)
- all symbol master objects
- all text layers

When creating a new Sketch library file, IDs must be preserved to not lose the connection to symbols and overrides in the Sketch file that uses the Sketch library file. This is why the [sketch-builder](../packages/sketch-builder/README.md) uses the sketch-object-id-collector when generating a new library version of an already existing library.

## Usage

Import the `getObjectIdMapping` function and call it with a path to a previous library build. The `outFile` parameter is optional. When given, the result of the collector is stored in a json-file.

```
import { getObjectIdMapping } from '@sketchmine/sketch-object-id-collector';

// ...

const prevBuild = '/path/to/previous/library.sketch';
const outFile = '/path/to/outfile.json';
const collection = await getObjectIdMapping(prevBuild, outFile);
```

### Command line arguments

The object ID collector can also be executed via the command line.

```
-h, --help  | display help
--file      | Sketch file, previous library build
--outFile   | json file to store the collection output (optional) 
```
