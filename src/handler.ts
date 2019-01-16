import Ajv from 'ajv'
// import * as cors from 'cors'
import * as http from 'http'
import * as micro from 'micro'
import * as FTS from './types'

export function createHttpHandler(
  definition: FTS.Definition,
  jsFilePath: string,
  options: Partial<FTS.HttpHandlerOptions> = {
    cors: {
      methods: ['GET', 'POST', 'OPTIONS', 'HEAD']
    }
  }
): FTS.HttpHandler {
  const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
  const validateParams = ajv.compile(definition.params.schema)
  // const validateReturns = ajv.compile(definition.returns)

  const opts: FTS.HttpHandlerOptions = {
    ...options
  }
  console.log(opts)

  let entryPoint: any = require(jsFilePath)

  if (!entryPoint) {
    throw new Error('Invalid FTS definition; empty JS module require.')
  }

  if (!definition.config.defaultExport) {
    if (!definition.config.namedExport) {
      throw new Error(
        'Invalid FTS definition; must have either a defaultExport or namedExport.'
      )
    }

    entryPoint = entryPoint[definition.config.namedExport]

    if (!entryPoint) {
      throw new Error(
        `Invalid FTS definition; JS export "${
          definition.config.namedExport
        }" doesn't exist.`
      )
    }
  }

  const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const context = new FTS.HttpContext(req, res)
    let params: any = {}

    if (req.method === 'GET') {
      params = context.query
    }

    const isValid = validateParams(params)
    if (!isValid) {
      const message = ajv.errorsText(validateParams.errors)
      const error = new Error(message)
      // TODO
      // error.statusCode = 400
      micro.sendError(req, res, error)
      return
    }

    const args = definition.params.order.map((name) => params[name])
    if (definition.params.context) {
      args.push(context)
    }

    try {
      Promise.resolve(entryPoint(...args)).then(
        (result: any) => {
          // TODO
          console.log(result)
        },
        (err) => {
          // TODO
          console.log('error', err)
        }
      )
    } catch (err) {
      // TODO
      console.log('error', err)
    }

    res.setHeader('content-type', 'text/plain')
    res.end(`The current time is ${new Date()}`)
  }

  // cors.default(opts.cors, handler)
  return handler
}
