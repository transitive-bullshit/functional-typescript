<img src="https://raw.githubusercontent.com/transitive-bullshit/fts/master/logo.png" alt="FTS Logo" width="150" />

# FTS "Hello World" Example

This is a simple example which transforms a "Hello World" TypeScript function into a type-safe HTTP endpoint. To do so, we perform the following steps:

1. Generate an `FTS.Definition`
2. Create an `FTS.HttpHandler`
3. Start an http server
4. Profit!

## Running

In order to run this example, you first need to build the top-level `fts` package locally.

Then, run:

```bash
$ yarn install
$ node index.js
```

Which will print out an `FTS.Definition` schema, as well as which port the server is listening on:

```
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

fts: Accepting connections on port 3000
```

Once you have the server running, you can invoke your type-safe function over HTTP:

```bash
$ curl -s 'http://localhost:3000?name=GET'
Hello GET!

$ curl -s 'http://localhost:3000' -d 'name=POST'
Hello POST!
```

Note that in this example, we're generating the FTS Definition and serving it together, but in practice we recommend that you generate these definitions during your build step, alongside your normal TS => JS compilation. The definitions should be viewed as json build artifacts that are _referenced_ at runtime in your server or serverless function.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
