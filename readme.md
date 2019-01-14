# Functional TypeScript

> TypeScript standard for serverless functions.

[![NPM](https://img.shields.io/npm/v/functional-typescript.svg)](https://www.npmjs.com/package/functional-typescript) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

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

- [ ] Function definition parser
  - [x] extract main function export
  - [x] convert main function signature to json schema
  - [x] support common jsdoc comments
  - [ ] make process readonly to source files
  - [ ] support custom tsconfig
  - [ ] initial CLI wrapper to generate function definitions
- [ ] Function invocation given a definition schema and JS file entrypoint
  - [ ] validate function parameters against json schema
  - [ ] support async functions
  - [ ] validate function return type against json schema
  - [ ] support optional FTS Context (ip, headers, etc)
- [ ] HTTP gateway implementation
- [ ] Documentation
- [ ] Testing
  - [ ] Basic unit tests for function definition parser
  - [ ] Basic unit tests for function invocation wrapper
  - [ ] Basic unit tests for HTTP gateway
  - [ ] Integration tests for TS function => definition => HTTP gateway

## Related

- [FaaSLang](https://github.com/faaslang/faaslang) - Very similar in spirit to this project but uses JavaScript with JSDoc instead of TypeScript.
- [AWS TypeScript Template](https://github.com/serverless/serverless/tree/master/lib/plugins/create/templates/aws-nodejs-typescript) - Default TypeScript template for AWS serverless functions.
- [Serverless Plugin TypeScript](https://github.com/prisma/serverless-plugin-typescript) - Serverless plugin for zero-config Typescript support.

- [Quicktype](https://quicktype.io) - Used under the hood for converting TypeScript types to [JSON Schema](https://json-schema.org).
- [typescript-json-scheema](https://github.com/YousefED/typescript-json-schema) - Generates JSON Schema from TypeScript.
- [typescript-to-json-schema](https://github.com/xiag-ag/typescript-to-json-schema) - Generates JSON Schema from TypeScript.
- [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) - Generates JSON Schema from TypeScript.
- [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) - Generates TypeScript from JSON Schema.

- [Statically Typed Data Validation with JSON Schema and TypeScript](https://spin.atomicobject.com/2018/03/26/typescript-data-validation) - Great related blog post by [Drew Colthorp](https://github.com/dcolthorp).

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
