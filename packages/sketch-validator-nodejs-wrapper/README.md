![Github banner for sketchmine](https://dt-cdn.net/images/github-banner-2x-1777-2b23e499af.png)

# @sketchmine/sketch-validator-nodejs-wrapper

The Node.js wrapper for the validation is a CLI tool that wraps the **@sketchmine/sketch-validator** in a command line tool where a file can be provided that should be validated. Currently in use for our CI environment.

- [@sketchmine/sketch-validator-nodejs-wrapper](#sketchminesketch-validator-nodejs-wrapper)
  - [Dependency graph](#dependency-graph)
  - [The CLI](#the-cli)
    - [CLI options](#cli-options)
    - [importing in your code](#importing-in-your-code)
    - [environments](#environments)
  - [Building the package](#building-the-package)
    - [Prerequisites](#prerequisites)
    - [how to build](#how-to-build)
  - [Linting](#linting)
  - [Testing the package](#testing-the-package)

## Dependency graph

![Dependency graph of the sketchmine sketch-validator](https://dt-cdn.net/images/sketch-validator-nodejs-wrapper-3920-bda7b02d9d.png)

## The CLI

The package can be consumed in two ways, First of all it can be executed via the CLI *(command line interface)*. You have to install the package with yarn or npm from `@sketchmine/sketch-validator-nodejs-wrapper` and then you can go ahead with `npx skm-sketch-validation --file /path/to/file.sketch` Therefore you have to provide at least one option:

### CLI options

| flag | description |
|---|---|
| --file | the file to validate *(required)* |
| -h | displays the help page |
| -c, --config | the path to the **sketchlint.json** that defines which rules should be used |

If no config flag is provided the default `sketchlint.json` will be taken.
The default sketchlint file has following configuration inside:

```json
{
  "version": "2.4.0",
  "rules": {
    "artboard-validation": true,
    "color-palette-validation":  true,
    "page-validation": true,
    "symbol-name-validation": true,
    "text-validation": true
  }
}
```

The version property is used to specify the docker image (it is the version of the validation package **@sketchmine/sketch-validator**.
It can be locked to a fix version like `2.1.0` or simply `latest`. Furthermore you can define if a rule should only warn or if it should break your CI with an exit code 1.

### importing in your code

The second option is to import it regular in your code base and you can provide it with the options from your script.

### environments

Our rules are defined for different environments. So at Dynatrace we have global rules that are responsible for the library files and on the other hand we provide rules for specific product screens.

The default validation environment is `global` (see all environments below). You can change it by adding the process environment variable `ENVIRONMENT=<env-name>` or passing an environment with the command-line args to the command above. Enable the debug mode by adding `DEBUG=true`.

## Building the package

### Prerequisites

To go ahead with building, developing you need to perform a `yarn install` to install all necessary dependencies. After this step you can go ahead with the further steps.

### how to build

To build the package [Rollup.js](https://rollupjs.org/guide/en) is used as a module bundler. The configuration can be found in the `rollup.config.js` file and is orchestrated by the [yarn](https://yarnpkg.com/en/) package manager.
The package bundle is formatted **commonjs** and is meant to be consumed only by node.js applications.

The build can be started with the following two commands:

- `yarn build` for building the package.
- `yarn dev` for building and watching the sources of the package *(rebuilds after save)*.

## Linting

The source code of this package is going to be linted by our CI environment. To ensure a coding standard and quality use the configured linter [tslint](https://palantir.github.io/tslint/). This package extends from the `tslint-config-airbnb` and the linting configuration extends from the root `tslint.json`.

Run `yarn lint` to execute the linter.

## Testing the package

To ensure that the sketch-validator-nodejs-wrapper is working, write tests and put them in proper named file.

**Important!**

All tests according to this package should be wrapped in a describe with the prefix: `[sketch-validator-nodejs-wrapper] › ...` like the following:

```typescript
// import statements

describe('[sketch-validator-nodejs-wrapper] › ${folder} › ${description of the suite}', () => {
  // your tests should be placed here
});
```

> For tests the **jest** Framework was chosen, see [jestjs.io](https://jestjs.io/) for details.

Run `yarn test` to execute all tests specified for the sketch-validator-nodejs-wrapper. Run `yarn test -f filename.test` to execute only tests that match the provided RegExp for the filename.
