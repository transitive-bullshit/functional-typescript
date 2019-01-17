const FTS = require('functional-typescript')

async function example() {
  const tsFilePath = './hello-world.ts'
  const jsFilePath = './hello-world.js'

  // Parse a TS file's main function export into an FTS.Definition schema.
  const definition = await FTS.generateDefinition(tsFilePath)
  console.log(definition)

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
