<img src="https://raw.githubusercontent.com/transitive-bullshit/functional-typescript/master/logo.png" alt="FTS Logo" width="150" />

# Functional TypeScript HTTP Client

> HTTP Client for [Functional TypeScript](https://github.com/transitive-bullshit/functional-typescript).

[![NPM](https://img.shields.io/npm/v/fts-http-client.svg)](https://www.npmjs.com/package/fts-http-client) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

See the main [docs](https://github.com/transitive-bullshit/functional-typescript) for more info on FTS in general.

Note that this client is **optional**, as FTS HTTP endpoints may be called using any HTTP request library.

The advantage to using this client library is that it performs parameter and return value validation as well as handling JSON encoding / decoding. The custom encoding / decoding is really only used for non-JSON primitive types such as `Date` and `Buffer`.

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

MIT © [Travis Fischer](https://transitivebullsh.it)
