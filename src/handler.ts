// import * as cors from 'cors'
import http from 'http'
import { readable } from 'is-stream'
import * as micro from 'micro'
import { Stream } from 'stream'
import { requireHandlerFunction } from './require-handler-function'
import * as FTS from './types'
import { createJsonSchemaValidator } from './validator'

const DEV = process.env.NODE_ENV === 'development'

export function createHttpHandler(
  definition: FTS.Definition,
  jsFilePath: string,
  options: Partial<FTS.HttpHandlerOptions> = {
    cors: {
      methods: ['GET', 'POST', 'OPTIONS', 'HEAD']
    }
  }
): FTS.HttpHandler {
  const validator = createJsonSchemaValidator()
  const validateParams = validator.compile(definition.params.schema)
  const validateReturns = validator.compile(definition.returns.schema)

  const opts: FTS.HttpHandlerOptions = {
    ...options
  }

  // TODO: add cors and use options
  console.log(opts)

  const innerHandler = requireHandlerFunction(definition, jsFilePath)

  // Note: it is inconvenient but important for this handler to not be async in
  // order to maximize compatibility with different Node.js server frameworks.
  const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const context = new FTS.HttpContext(req, res)

    getParams(context, definition)
      .then((params: any) => {
        const hasValidParams = validateParams(params)
        if (!hasValidParams) {
          const message = validator.errorsText(validateParams.errors)
          sendError(context, new Error(message), 400)
          return
        }

        const args = definition.params.order.map((name) => params[name])
        if (definition.params.context) {
          args.push(context)
        }

        try {
          Promise.resolve(innerHandler(...args))
            .then((result: any) => {
              const isValidReturnType = validateReturns(result)
              if (!isValidReturnType) {
                const message = validator.errorsText(validateReturns.errors)
                sendError(context, new Error(message), 502)
                return
              }

              if (result === null) {
                send(context, res.statusCode || 204, result)
              } else if (result !== undefined) {
                send(context, res.statusCode || 200, result)
              }
            })
            .catch((err) => {
              sendError(context, err, 403)
            })
        } catch (err) {
          sendError(context, err)
        }
      })
      .catch((err) => {
        sendError(context, err)
      })
  }

  // cors.default(opts.cors, handler)
  return handler
}

async function getParams(
  context: FTS.HttpContext,
  definition: FTS.Definition
): Promise<any> {
  let params: any = {}

  if (context.req.method === 'GET') {
    params = context.query
  } else if (context.req.method === 'POST') {
    params = await micro.json(context.req)
  } else {
    throw micro.createError(501, 'Not implemented')
  }

  if (Array.isArray(params)) {
    params = params.reduce((acc, param, i) => {
      const name = definition.params.order[i]
      if (name) {
        acc[name] = param
      }
      return acc
    }, {})
  }

  if (typeof params !== 'object') {
    throw micro.createError(400, 'Invalid parameters')
  }

  return params
}

function send(context: FTS.HttpContext, code: number, obj: any = null) {
  const { res } = context
  res.statusCode = code

  if (obj === null) {
    res.end()
    return
  }

  if (Buffer.isBuffer(obj)) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/octet-stream')
    }

    res.setHeader('Content-Length', obj.length)
    res.end(obj)
    return
  }

  if (obj instanceof Stream || readable(obj)) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/octet-stream')
    }

    obj.pipe(res)
    return
  }

  let jsonify = false
  let str = obj
  switch (typeof str) {
    case 'object':
      jsonify = true
      break
    case 'number':
      jsonify = true
      break
    case 'string':
      jsonify = context.accepts('text', 'json') === 'json'
      break
  }

  if (jsonify) {
    // We stringify before setting the header in case `JSON.stringify` throws
    // and a 500 has to be sent instead.

    // The `JSON.stringify` call is split into two cases as `JSON.stringify`
    // is optimized in V8 if called with only one argument
    str = DEV ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)

    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
  }

  res.setHeader('Content-Length', Buffer.byteLength(str))
  res.end(str)
}

function sendError(
  context: FTS.HttpContext,
  error: Error,
  statusCode?: number
) {
  /* tslint:disable no-string-literal */
  if (statusCode || error['statusCode'] === undefined) {
    error['statusCode'] = statusCode || 500
  }
  /* tslint:enable no-string-literal */
  micro.sendError(context.req, context.res, error)
}
