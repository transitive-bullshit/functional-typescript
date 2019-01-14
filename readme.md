# Functional TypeScript (FTS)

> TypeScript standard for serverless functions.

[![NPM](https://img.shields.io/npm/v/functional-typescript.svg)](https://www.npmjs.com/package/functional-typescript) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## Features

- Adds type safety to your serverless functions
- Adds built-in documentation to your serverless functions
- Compatible with all serverless providers (AWS, GCP, Azure, etc)

## What is FTS?

FTS transforms a standard TypeScript function like this:

```ts
/**
 * This is a basic TypeScript function.
 */
export function hello(name: string = 'World'): string {
  return `Hello ${name}!`
}
```

Into a badass serverless function that can be called over HTTP like this (GET):

```
https://example.com/hello?name=Travis
```

Or like this (POST):

```
{
  "name": "Travis"
}
```

And returns a result like this:

```
"Hello Travis!"
```

All parameters and return values are type-checked by the FTS gateway, so you can invoke your TypeScript functions remotely with the same confidence as calling them directly.

## Why Functional TypeScript?

The serverless space has seen such rapid growth, that tooling, especially across different providers, has struggled to keep up. One of the major disadvantages of using serverless functions at the moment is that each API provider generally has their own conventions and caveats, which can quickly lead to vendor lock-in.

For example, take the following Node.js "Hello World" function defined across several popular serverless providers:

**AWS**

```js
exports.handler = (event, context, callback) => {
  const name = event.name || 'World'
  callback(null, `Hello ${name}!`)
}
```

**Azure**

```js
module.exports = function(context, req) {
  const name = req.query.name || (req.body && req.body.name) || 'World'
  context.res = { body: `Hello ${name}!` }
  context.done()
}
```

**GCP**

```js
const escapeHtml = require('escape-html')

exports.hello = (req, res) => {
  const name = req.query.name || req.body.name || 'World'
  res.send(`Hello ${escapeHtml(name)}!`)
}
```

**Functional TypeScript**

```ts
export function hello(name = 'World') {
  return `Hello ${name}!`
}
```

FTS allows you to define **provider-agnostic** serverless functions while also giving you **strong type checking** and **built-in documentation** for free.

## Usage

You may use this package as a CLI or programatically as a module.

#### CLI

```bash
npm install -g functional-typescript
```

This will install the `fts` CLI program globally.

```bash
fts --help
```

#### Module

```bash
npm install --save functional-typescript
```

```js
const fts = require('functional-typescript')

// TODO
```

## FTS Specification

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
export default async function ExampleFunction(
  foo: string,
  bar: number,
  nala?: Nala
): Promise<string> {
  return 'Hello World!'
}
```

FTS will generate a JSON Schema that fully specifies the default `ExampleFunction` export.

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
  - [ ] Description of how it works
  - [ ] How to use with different serverless cloud providers
- [ ] Testing
  - [ ] Basic unit tests for function definition parser
  - [ ] Basic unit tests for function invocation wrapper
  - [ ] Basic unit tests for HTTP gateway
  - [ ] Integration tests for TS function => definition => HTTP gateway
- [ ] Post-MVP
  - [ ] Support multiple
  - [ ] now-builder for FTS functions

## FAQ

#### Why Serverless?

Serverless functions allow your code to be executed on-demand and scale automatically both up towards infinity and down to zero. They minimize cost in terms of infrastructure and engineering time, largely due to removing operational overhead and reducing the surface area for potential errors.

For more information, see [Why Serverless?](https://serverless.com/learn/overview), and an excellent breakdown on the [Tradeoffs that come with Serverless](https://martinfowler.com/articles/serverless.html).

#### How is FTS related to FaaSLang?

Functional TypeScript builds off of and shares many of the same design goals as [FaaSLang](https://github.com/faaslang/faaslang). The main difference is that FaaSLang's default implementation uses JavaScript + JSDoc to generate custom schemas for function definitions, whereas FTS uses TypeScript to generate JSON Schemas for function definitions.

In our experience, the relatively mature [JSON Schema](https://json-schema.org) specification provides a more solid and extensible base for the core definition layer. JSON Schema also provides interop with a large ecosystem of existing tools and languages without further development. For example, it would be relatively simple to extend FTS in the future beyond TypeScript to generate JSON Schemas from any language that is supported by [Quicktype](https://quicktype.io).

#### How do I use FTS with my Serverless Provider (AWS, GCP, Kubeless, Fn, Azure, OpenWhisk, etc)?

Great question -- this answer will be updated once we have a good answer... 😁

## Related

- [FaaSLang](https://github.com/faaslang/faaslang) - Very similar in spirit to this project but uses JavaScript with JSDoc instead of TypeScript.
- [AWS TypeScript Template](https://github.com/serverless/serverless/tree/master/lib/plugins/create/templates/aws-nodejs-typescript) - Default TypeScript template for AWS serverless functions.
- [Serverless Plugin TypeScript](https://github.com/prisma/serverless-plugin-typescript) - Serverless plugin for zero-config Typescript support.

---

- [Quicktype](https://quicktype.io) - Used under the hood for converting TypeScript types to [JSON Schema](https://json-schema.org).
- [typescript-json-scheema](https://github.com/YousefED/typescript-json-schema) - Generates JSON Schema from TypeScript.
- [typescript-to-json-schema](https://github.com/xiag-ag/typescript-to-json-schema) - Generates JSON Schema from TypeScript.
- [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) - Generates JSON Schema from TypeScript.
- [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) - Generates TypeScript from JSON Schema.

---

- [Statically Typed Data Validation with JSON Schema and TypeScript](https://spin.atomicobject.com/2018/03/26/typescript-data-validation) - Great related blog post.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
