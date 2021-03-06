![Github banner for sketchmine](https://dt-cdn.net/images/github-banner-2x-1777-2b23e499af.png)

# @sketchmine/node-helpers

This package is a collection of [Node.js](https://nodejs.org/en/) specific helpers.

- [@sketchmine/node-helpers](#sketchminenode-helpers)
  - [Dependency graph](#dependency-graph)
  - [List of Helpers](#list-of-helpers)
  - [Building the package](#building-the-package)
  - [Linting](#linting)
  - [Testing the package](#testing-the-package)

## Dependency graph

![Dependency graph of the sketchmine  node-helpers](https://dt-cdn.net/images/node-helpers-3920-c6497126b4.png)

## List of Helpers

- **[bytesToSize](./src/bytes-to-size.ts)** Displays bytes in a human readable format.
- **[copyFile](./src/copy-file.ts)** Copies file from one destination to another destination (`async`).
- **[createDir](./src/create-dir.ts)** Creates a folder (`sync`).
- **[delFolder](./src/del-folder.ts)** Deletes a folder recursively (`sync`).
- **[displayHelp](./src/display-help.ts)** Logs a CLI help page to the console.
- **[executeCommand](./src/execute-command.ts)** Executes a command on the spawned shell (`async`).
- **[isFile](./src/is-file.ts)** Checks if the string is a file (`sync`).
- **[Logger](./src/logger.ts)** Custom Logger for the library with different logging spaces.
- **[readDirRecursively](./src/read-dir-recursivly.ts)** Lists all children of a directory recursively, (`sync`).
- **[readFile](./src/read-file.ts)** Implementation of readFile (`async`).
- **[writeFile](./src/write-file.ts)** Safely writes content to file. Can create one directory to store file (`async`).
- **[writeJson](./src/write-json.ts)** Safely writes Object or string as JSON file (`async`).
- **[zipToBuffer](./src/zip-to-buffer.ts)** Get a Promised Array of File buffers from zip (`async`).

## Building the package

To build the package [Rollup.js](https://rollupjs.org/guide/en) is used as a module bundler. The configuration can be found in the `rollup.config.js` file and is orchestrated by the [Yarn](https://yarnpkg.com/en/) package manager.
The package bundle is formatted as **commonjs** and is meant to be consumed only by Node.js applications.

The build can be started with the following two commands:

- `yarn build` for building the package.
- `yarn dev` for building and watching the sources of the package.

## Linting

The source code of this package will be linted by our CI environment. To ensure a coding standard and quality, use the configured linter [tslint](https://palantir.github.io/tslint/). This package extends from the `tslint-config-airbnb` and the linting configuration extends from the root `tslint.json`.

Run `yarn lint` to execute the linter.

## Testing the package

To ensure that the helpers are working, write tests and put them in a properly named file.

**Note**: All tests based on this package should be wrapped in a `describe` element with the prefix: `[node-helpers] › ...` like the following:

```typescript
// import statements

describe('[node-helpers] › ${description of the functionality that should be tested}', () => {
  // your tests should be placed here
});
```

> The [Jest framework](https://jestjs.io/) has been selected for tests.

Run `yarn test` to run all tests specified for the helpers. Run `yarn test -f filename.test` to execute only tests that match the provided RegExp for the filename.
