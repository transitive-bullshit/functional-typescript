<a href="https://github.com/transitive-bullshit/functional-typescript" title="Functional TypeScript">
  <img src="https://raw.githubusercontent.com/transitive-bullshit/functional-typescript/master/logo.png" alt="FTS Logo" width="150" />
</a>

# now-fts

> [@zeit/now](https://zeit.co/now) [builder](https://zeit.co/docs/v2/deployments/builders/overview) for [Functional TypeScript](https://github.com/transitive-bullshit/functional-typescript).

[![NPM](https://img.shields.io/npm/v/now-fts.svg)](https://www.npmjs.com/package/now-fts) [![Build Status](https://travis-ci.com/transitive-bullshit/functional-typescript.svg?branch=master)](https://travis-ci.com/transitive-bullshit/functional-typescript) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

The main benefit of `now-fts` is that you **just write TypeScript functions** and can easily deploy robust serverless functions. No dealing with HTTP, parameter validation, or data encoding / decoding!

See the main [docs](https://github.com/transitive-bullshit/functional-typescript) for info on FTS in general.

## Usage

Say we have the following FTS function:

```ts
// example.ts
export function example(name: string, foo: number): string {
  return `${name}: ${foo}`
}
```

You can use the `now-fts` builder to deploy it as an HTTP lambda with the following `now.json`:

```json
// now.json
{
  "version": 2,
  "builds": [{ "src": "example.ts", "use": "now-fts" }]
}
```

Then deploy the application via the `now` command.

The resulting deployment will use an `fts-http` handler to respond to HTTP requests by invoking the original `example` function, without you having to deal with HTTP, server logic, parameter checking, or data encoding / decoding.

## License

MIT © [Saasify](https://saasify.sh)
