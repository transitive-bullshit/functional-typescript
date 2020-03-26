<a href="https://github.com/transitive-bullshit/functional-typescript" title="Functional TypeScript">
  <img src="https://raw.githubusercontent.com/transitive-bullshit/functional-typescript/master/logo.png" alt="FTS Logo" width="150" />
</a>

> HTTP Client for [Functional TypeScript](https://github.com/transitive-bullshit/functional-typescript).

[![NPM](https://img.shields.io/npm/v/fts-http-client.svg)](https://www.npmjs.com/package/fts-http-client) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

See the main [docs](https://github.com/transitive-bullshit/functional-typescript) for more info on FTS in general.

Note that this client is **optional**, as FTS HTTP endpoints may be called using any HTTP request library.

The advantage to using this client library is that it performs parameter and return value validation as well as handling JSON encoding / decoding. The custom encoding / decoding is really only used for non-JSON primitive types such as `Date` and `Buffer`.

## Usage

Say we have the following FTS function:

```ts
export function example(name: string, date: Date): string {
  return `${name}: ${date}`
}
```

You can invoke this function remotely with the following client code:

```ts
import { createHttpClient } from 'fts-http-client'

// previously generated fts definition
const definition = {}

// URL of an fts-http handler endpoint
const url = 'https://example.com/foo'

// create a client that will be used to call the remote FTS function
const client = createHttpClient(definition, url)

// You may either call the remote function with the same signature as the
// original TS function or with an object of named parameters
const result0 = await client('Foo', new Date())
const result1 = await client({ name: 'Foo', date: new Date() })
```

## Alternatives

- Node.js
  - [got](https://github.com/sindresorhus/got) - set `json` option to `true`
  - [request](https://github.com/request/request) - set `json` option to `true`
- Browser
  - [isomorphic-unfetch](https://github.com/developit/unfetch/tree/master/packages/isomorphic-unfetch)
  - [axios](https://github.com/axios/axios)
- CLI
  - [httpie](https://httpie.org)
  - [curl](https://github.com/tldr-pages/tldr/blob/master/pages/common/curl.md)

## License

MIT © [Saasify](https://saasify.sh)
