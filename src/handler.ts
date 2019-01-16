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
  const validateReturns = ajv.compile(definition.returns.schema)

  const opts: FTS.HttpHandlerOptions = {
    ...options
  }

  // TODO: add cors and use options
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

  const sendError = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    error: Error,
    statusCode = 500
  ) => {
    /* tslint:disable no-string-literal */
    error['statusCode'] = statusCode
    /* tslint:enable no-string-literal */
    console.log(error)
    micro.sendError(req, res, error)
  }

  const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const context = new FTS.HttpContext(req, res)
    let params: any = {}

    if (req.method === 'GET') {
      params = context.query
    } else {
      // TODO: handle
      sendError(req, res, new Error('TODO: support more HTTP methods'))
      return
    }

    const hasValidParams = validateParams(params)
    if (!hasValidParams) {
      const message = ajv.errorsText(validateParams.errors)
      sendError(req, res, new Error(message), 400)
      return
    }

    const args = definition.params.order.map((name) => params[name])
    if (definition.params.context) {
      args.push(context)
    }

    try {
      Promise.resolve(entryPoint(...args)).then(
        (result: any) => {
          const isValidReturnType = validateReturns(result)
          if (!isValidReturnType) {
            const message = ajv.errorsText(validateReturns.errors)
            sendError(req, res, new Error(message), 502)
            return
          }

          micro.send(res, 200, result)
        },
        (err) => {
          sendError(req, res, err, 403)
          return
        }
      )
    } catch (err) {
      sendError(req, res, err, 500)
      return
    }
  }

  // cors.default(opts.cors, handler)
  return handler
}
