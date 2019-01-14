# Functional TypeScript

> TypeScript standard for serverless functions.

[![NPM](https://img.shields.io/npm/v/functional-typescript.svg)](https://www.npmjs.com/package/functional-typescript) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Intro

Given the following TypeScript file:

```ts
enum Color {
  Red,
  Green,
  Blue
}

interface Nala {
  numbers: number[]
  color: Color
}

/**
 * This is an example description for an example function.
 *
 * @param foo - Example describing string `foo`.
 * @returns Description of return value.
 */
export async function ExampleFunction(
  foo: string,
  bar: number,
  nala?: Nala
): Promise<string> {
  return 'Hello World'
}
```

FTS will generate a JSON Schema that fully specifies the main function export, `ExampleFunction`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "description": "This is an example description for an example function.",
  "title": "ExampleFunction",
  "type": "object",
  "properties": {
    "params": {
      "$ref": "#/definitions/FTSParams"
    },
    "return": {
      "description": "Description of return value.",
      "type": "Promise<string>"
    }
  },
  "required": ["params", "return"],
  "definitions": {
    "FTSParams": {
      "type": "object",
      "properties": {
        "foo": {
          "description": "Example describing string `foo`.",
          "type": "string"
        },
        "bar": {
          "type": "number"
        },
        "nala": {
          "$ref": "#/definitions/Nala"
        }
      },
      "required": ["bar", "foo"]
    },
    "Nala": {
      "type": "object",
      "properties": {
        "numbers": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "color": {
          "$ref": "#/definitions/Color"
        }
      },
      "required": ["color", "numbers"]
    },
    "Color": {
      "enum": [0, 1, 2],
      "type": "number"
    }
  }
}
```

Note that this JSON Schema allows for easy type checking, documentation generation, and asynchronous function invocation.

## Install

This module requires `node >= 8`.

```bash
npm install --save functional-typescript
```

This will install the `fts` CLI program globally.

## Usage

#### CLI

```bash
fts --help

TODO
```

```js
const fts = require('functional-typescript')

// TODO
```

## How it works

TODO

## Roadmap

FTS is an active WIP.

- [ ] Function definition parser
  - [x] extract main function export
  - [x] convert main function signature to json schema
  - [x] support common jsdoc comments
  - [ ] make process readonly to source files
  - [ ] support custom tsconfig
  - [ ] CLI wrapper to generate function definitions
- [ ] Function invocation given an FTS definition schema and JS file entrypoint
  - [ ] validate function parameters against json schema
  - [ ] support async functions
  - [ ] validate function return type against json schema
  - [ ] support optional FTS Context (ip, headers, etc)
- [ ] HTTP gateway implementation
- [ ] Documentation
  - [ ] Usage Info
  - [ ] Standard Specification
  - [ ] Example functions (test suite)
  - [ ] How to use with different serverless cloud providers
- [ ] Testing
  - [ ] Basic unit tests for function definition parser
  - [ ] Basic unit tests for function invocation wrapper
  - [ ] Basic unit tests for HTTP gateway
  - [ ] Integration tests for TS function => definition => HTTP gateway
- [ ] Post-MVP
  - [ ] Support multiple
  - [ ] now-builder for FTS functions

## Related

- [FaaSLang](https://github.com/faaslang/faaslang) - Very similar in spirit to this project but uses JavaScript with JSDoc instead of TypeScript.
- [AWS TypeScript Template](https://github.com/serverless/serverless/tree/master/lib/plugins/create/templates/aws-nodejs-typescript) - Default TypeScript template for AWS serverless functions.
- [Serverless Plugin TypeScript](https://github.com/prisma/serverless-plugin-typescript) - Serverless plugin for zero-config Typescript support.

- [Quicktype](https://quicktype.io) - Used under the hood for converting TypeScript types to [JSON Schema](https://json-schema.org).
- [typescript-json-scheema](https://github.com/YousefED/typescript-json-schema) - Generates JSON Schema from TypeScript.
- [typescript-to-json-schema](https://github.com/xiag-ag/typescript-to-json-schema) - Generates JSON Schema from TypeScript.
- [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) - Generates JSON Schema from TypeScript.
- [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) - Generates TypeScript from JSON Schema.

- [Statically Typed Data Validation with JSON Schema and TypeScript](https://spin.atomicobject.com/2018/03/26/typescript-data-validation) - Great related blog post.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
