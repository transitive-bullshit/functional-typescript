const fts = require('functional-typescript')
const ftsHttp = require('functional-typescript-http')

async function example() {
  const tsFilePath = './hello-world.ts'
  const jsFilePath = './hello-world.js'

  // Parse a TS file's main function export into an FTS.Definition schema.
  console.log('Generating definition', tsFilePath)
  const definition = await fts.generateDefinition(tsFilePath)
  console.log(JSON.stringify(definition, null, 2))

  // Create a standard http handler function `(req, res) => { ... }` that will
  // invoke the compiled JS function, performing type checking and conversions
  // between http and json for the function's parameters and return value.
  const handler = ftsHttp.createHttpHandler(definition, jsFilePath)

  // Create a `micro` http server that uses our ftsHttp.HttpHandler to respond
  // to incoming http requests.
  await ftsHttp.createHttpServer(handler, 'http://localhost:3000')

  // You could alternatively use your `handler` with any Node.js server
  // framework, such as express, koa, @now/node, etc.
}

example().catch((err) => {
  console.error(err)
  process.exit(1)
})
