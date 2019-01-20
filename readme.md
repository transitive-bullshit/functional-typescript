<img src="https://raw.githubusercontent.com/transitive-bullshit/functional-typescript/master/logo.png" alt="FTS Logo" width="150" />

# Functional TypeScript

> TypeScript standard for rock solid serverless functions.

[![NPM](https://img.shields.io/npm/v/functional-typescript.svg)](https://www.npmjs.com/package/functional-typescript) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## Features

- **Robust**: Type-safe serverless functions!
- **Simple**: Quick to setup and integrate
- **Standard**: Just TypeScript + JSON Schema
- **Compatible**: Supports all major serverless providers (AWS, GCP, Azure, Now, etc)
- **Explicit**: Easily generate serverless function docs
- **Fast**: Uses [ajv](https://github.com/epoberezkin/ajv) for schema validation
- **Lightweight**: Focused http handler optimized for serverless environments

## What is Functional TypeScript (FTS)?

FTS transforms standard TypeScript functions like this:

```ts
/**
 * This is a basic TypeScript function.
 */
export function hello(name: string = 'World'): string {
  return `Hello ${name}!`
}
```

Into type-safe serverless functions that can be called over HTTP like this (GET):

```
https://example.com/hello?name=GitHub
```

Or like this (POST):

```
{
  "name": "GitHub"
}
```

And returns a result like this:

```
"Hello GitHub!"
```

All parameters and return values are type-checked by a standard Node.js HTTP handler, so you can invoke your TypeScript functions remotely with the same confidence as calling them directly.

The only difference is that they're now infinitely scalable!

## Why Functional TypeScript?

The serverless space has seen such rapid growth that tooling, especially across different cloud providers, has struggled to keep up. One of the major disadvantages of using serverless functions at the moment is that each cloud provider has their own conventions and gotchas, which can quickly lead to vendor lock-in.

For example, take the following Node.js serverless function defined across several cloud providers:

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

**FTS**

```ts
export function hello(name: string = 'World'): string {
  return `Hello ${name}!`
}
```

FTS allows you to define **provider-agnostic** serverless functions while also giving you **strong type checking** and **built-in documentation** for free.

## Usage

You can use this package as either a CLI or as a module.

### CLI

```bash
npm install -g functional-typescript
```

This will install the `fts` CLI program globally.

```
Generates an FTS Definition schema given a TS input file.

Usage: fts [options] <file.ts>

Options:
  -p, --project <project>  Path to 'tsconfig.json'.
  -h, --help               output usage information
```

### Module

```bash
npm install --save functional-typescript
```

Here is an end-to-end example ([examples/hello-world](./examples/hello-world)).

```js
const FTS = require('functional-typescript')

async function example() {
  const tsFilePath = './hello-world.ts'
  const jsFilePath = './hello-world.js'

  // Parse a TS file's main function export into an FTS.Definition schema.
  const definition = await FTS.generateDefinition(tsFilePath)

  // Create a standard http handler function `(req, res) => { ... }` that will
  // invoke the compiled JS function, performing type checking and conversions
  // between http and json for the function's parameters and return value.
  const handler = FTS.createHttpHandler(definition, jsFilePath)

  // Create a `micro` http server that uses our FTS.HttpHandler to respond
  // to incoming http requests.
  await FTS.createHttpServer(handler, 'http://localhost:3000')

  // You could alternatively use your `handler` with any Node.js server
  // framework, such as express, koa, @now/node, etc.
}

example().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Once you have a server running, you can invoke your type-safe function over HTTP:

```bash
$ curl -s 'http://localhost:3000?name=GET'
Hello GET!

$ curl -s 'http://localhost:3000' -d 'name=POST'
Hello POST!
```

Note that in this example, we're generating the FTS Definition and serving it together, but in practice we recommend that you generate these definitions during your build step, alongside your normal TS => JS compilation. The definitions should be viewed as json build artifacts that are _referenced_ at runtime in your server or serverless function.

## FTS Definition

Given our "hello world" example from earlier, FTS generates the following JSON definition that fully specifies the `hello` function export.

```json
{
  "title": "hello",
  "version": "0.0.1",
  "config": {
    "language": "typescript",
    "defaultExport": false,
    "namedExport": "hello"
  },
  "params": {
    "context": false,
    "order": ["name"],
    "schema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "default": "World"
        }
      },
      "additionalProperties": false,
      "required": ["name"],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  "returns": {
    "async": false,
    "schema": {
      "type": "object",
      "properties": {
        "result": {
          "type": "string"
        }
      },
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
}
```

In addition to some metadata, this definition contains a JSON Schema for the function's parameters and a JSON Schema for the function's return type.

Note that this definition allows for easy **type checking**, **documentation generation**, and **automated testing** via tools like [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker).

## Roadmap

FTS is an active WIP.

- [x] Function definition parser
  - [x] extract main function export
  - [x] convert main function signature to json schema
  - [x] add support for common jsdoc comments
  - [x] fix should be readonly to source files
  - [x] fix async / promise return types
  - [x] fix support for arrow function exports
  - [x] add support for default values
  - [x] add support for void return type
  - [x] add support for Buffer type
  - [x] add support for Date type
  - [x] add support for returning Buffer and Date types
  - [ ] add support for custom tsconfig
  - [x] add CLI wrapper to generate function definitions
  - [x] add support for standard JS with jsdoc comments
- [x] HTTP handler to invoke a function given an FTS definition and JS file entrypoint
  - [x] add support for HTTP GET
  - [x] add support for other HTTP methods
  - [x] validate function parameters against json schema
  - [x] validate function return type against json schema
  - [x] add support for passing params as array
  - [x] add support for async functions
  - [x] add support for http context (ip, headers, etc)
  - [ ] add support for setting response headers
  - [ ] add support for CORS
  - [ ] add CLI support for invoking functions via http handler
- [x] HTTP server implementation
- [ ] Documentation
  - [x] basic usage example
  - [x] example functions (test suite)
  - [ ] standard specification
  - [ ] description of how it works
  - [ ] how to use with different serverless cloud providers
- [x] Testing
  - [x] basic unit tests for function definition parser
  - [x] basic unit tests for function http handler
  - [x] integration tests for TS function => definition => HTTP server
- [ ] Misc
  - [ ] create separate packages for parser+cli, handler, and server
- [ ] Post-MVP
  - [ ] support multiple source languages
  - [ ] support multiple transport handlers (http, grpc, thrift)
  - [ ] now-builder for FTS functions

## FAQ

### Why Serverless?

Serverless functions allow your code to run on-demand and scale automatically both infinitely upwards and down to zero. They are great at minimizing cost in terms of infrastructure and engineering time, largely due to removing operational overhead and reducing the surface area for potential errors.

For more information, see [Why Serverless?](https://serverless.com/learn/overview), and an excellent breakdown on the [Tradeoffs that come with Serverless](https://martinfowler.com/articles/serverless.html).

### How is this different from other RPC standards?

Functional TypeScript is a standard for declaring and invoking remote functions. This type of invocation is known as an [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) or remote procedure call.

Some other notable RPC standards include [SOAP](https://en.wikipedia.org/wiki/SOAP), [Apache Thrift](https://en.wikipedia.org/wiki/Apache_Thrift), and [gRPC](https://en.wikipedia.org/wiki/GRPC).

> So how does FTS fit into this picture?

First off, FTS is fully compatible with these other RPC standards, with a gRPC transport layer being prioritized on the roadmap.

The default HTTP handler with JSON Schema validation is the simplest way of using FTS, but it's pretty straightforward to interop with other RPC standards. For example, to use FTS with gRPC, we need to convert the JSON Schemas into protocol buffers (both of which describe the types and format of data) and add a gRPC handler which calls our compiled target JS function. Of course, there are pros and cons to using HTTP vs gRPC, with HTTP being easier to use and debug and gRPC being more efficient and scalable.

The real benefit of FTS is that the remote function definitions are just standard TypeScript, without you having to worry about the complexities of gRPC, protocol buffers, or other RPC formats. **You only need to understand and write TypeScript.**

Couple that with the simplicity and scalability of serverless functions, and FTS starts to become really powerful, enabling any TypeScript developer to create rock solid serverless functions easier than ever before.

### How is FTS related to FaaSLang?

Functional TypeScript builds off of and shares many of the same design goals as [FaaSLang](https://github.com/faaslang/faaslang). The main difference is that FaaSLang's default implementation uses **JavaScript + JSDoc** to generate **custom schemas** for function definitions, whereas **FTS uses TypeScript** to generate **JSON Schemas** for function definitions.

In our opinion, the relatively mature [JSON Schema](https://json-schema.org) specification provides a more solid and extensible base for the core schema validation layer. JSON Schema also provides interop with a large ecosystem of existing tools and languages. For example, it would be relatively simple to **extend FTS beyond TypeScript** to generate JSON Schemas from any language that is supported by [Quicktype](https://quicktype.io) (Go, Objective-C, C++, etc).

FTS also exposes a standard Node.js [http handler](https://nodejs.org/api/http.html#http_event_request) for invoking FTS functions `(req, res) => { ... }`. This makes it **extremely easy to integrate with popular Node.js server frameworks** such as [express](https://expressjs.com), [koa](https://koajs.com), and [micro](https://github.com/zeit/micro). While FaaSLang could potentially be extended to support more general usage, the default implementation currently only supports a custom API gateway server... which makes me a sad panda. 🐼

### How do I use FTS with my Serverless Provider (AWS, GCP, Azure, Now, OpenWhisk, etc)?

Great question -- this answer will be updated once we have a good answer... 😁

## Related

- [FaaSLang](https://github.com/faaslang/faaslang) - Very similar in spirit to this project but uses JavaScript with JSDoc instead of TypeScript.
- [AWS TypeScript Template](https://github.com/serverless/serverless/tree/master/lib/plugins/create/templates/aws-nodejs-typescript) - Default TypeScript template for AWS serverless functions.
- [Serverless Plugin TypeScript](https://github.com/prisma/serverless-plugin-typescript) - Serverless plugin for zero-config Typescript support.

---

- [typescript-json-schema](https://github.com/YousefED/typescript-json-schema) - Used under the hood to convert TypeScript types to [JSON Schema](https://json-schema.org).
- [Quicktype](https://quicktype.io) - Very useful utility which uses JSON Schema as a common standard for converting between different type systems.

---

- [Statically Typed Data Validation with JSON Schema and TypeScript](https://spin.atomicobject.com/2018/03/26/typescript-data-validation) - Great related blog post.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
