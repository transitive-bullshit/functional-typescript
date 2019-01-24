<a href="https://github.com/transitive-bullshit/functional-typescript" title="Functional TypeScript"><img src="https://raw.githubusercontent.com/transitive-bullshit/functional-typescript/master/logo.png" alt="FTS Logo" width="150" /></a>

> Dev Server for [Functional TypeScript](https://github.com/transitive-bullshit/functional-typescript).

[![NPM](https://img.shields.io/npm/v/fts-dev.svg)](https://www.npmjs.com/package/fts-dev) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

See the main [docs](https://github.com/transitive-bullshit/functional-typescript) for more info on FTS in general.

## Install

```bash
npm install -g fts-dev
```

## Usage

Say we have the following FTS function:

```ts
// example.ts
export function example(name: string, date: Date): string {
  return `${name}: ${date}`
}
```

You can easily create a local dev server for this function with:

```bash
fts-dev example.ts
```

The server defaults to port 3000.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
