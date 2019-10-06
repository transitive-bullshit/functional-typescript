import { Definition } from 'fts'
import { createValidator } from 'fts-validator'
import http from 'http'
import { readable } from 'is-stream'
import * as micro from 'micro'
import cors = require('micro-cors')
import { Stream } from 'stream'
import { HttpContext } from './http-context'
import { requireHandlerFunction } from './require-handler-function'
import * as HTTP from './types'

const DEV = process.env.NODE_ENV === 'development'

export function createHttpHandler(
  definition: Definition,
  jsFilePathOrModule: string | object,
  options = {
    cors: {
      allowMethods: ['GET', 'POST', 'OPTIONS', 'HEAD']
    }
  }
): HTTP.HttpHandler {
  const validator = createValidator()
  const validateParams = validator.decoder(definition.params.schema)
  const validateReturns = definition.returns.http
    ? null
    : validator.encoder(definition.returns.schema)

  const innerHandler = requireHandlerFunction(definition, jsFilePathOrModule)

  // Note: it is inconvenient but important for this handler to not be async in
  // order to maximize compatibility with different Node.js server frameworks.
  const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const context = new HttpContext(req, res)

    if (context.req.method === 'OPTIONS') {
      send(context, 200, 'ok')
      return
    }

    getParams(context)
      .then((params: any) => {
        const hasValidParams = validateParams(params)
        if (!hasValidParams) {
          const message = validator.ajv.errorsText(validateParams.errors)
          sendError(context, new Error(message), 400)
          return
        }

        const args = definition.params.order.map((name) => params[name])
        if (definition.params.context) {
          args.push(context)
        }

        // Push additional props into args if allowing additionalProperties
        if (definition.params.schema.additionalProperties) {
          Object.keys(params).forEach((name) => {
            if (definition.params.order.indexOf(name) === -1) {
              args.push([name, params[name]])
            }
          })
        }

        try {
          Promise.resolve(innerHandler(...args))
            .then((result: any) => {
              const returns = { result }

              if (definition.returns.http) {
                // skip validation for raw http response
                returns.result = result.body
                res.statusCode = result.statusCode

                if (result.headers) {
                  for (const [key, value] of Object.entries(result.headers)) {
                    res.setHeader(key, value as string | number | string[])
                  }
                }
              } else {
                // validate return value
                const isValidReturnType = validateReturns(returns)
                if (!isValidReturnType) {
                  const message = validator.ajv.errorsText(
                    validateReturns.errors
                  )
                  sendError(context, new Error(message), 502)
                  return
                }
              }

              if (returns.result === null || returns.result === undefined) {
                send(context, res.statusCode || 204, returns.result)
              } else {
                send(context, res.statusCode || 200, returns.result)
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

  return cors(options.cors)(handler)
}

async function getParams(context: HttpContext): Promise<any> {
  let params: any = {}

  if (context.req.method === 'GET') {
    params = context.query
  } else if (context.req.method === 'POST') {
    params = await micro.json(context.req)
  } else {
    throw micro.createError(501, 'Not implemented\n')
  }

  if (typeof params !== 'object') {
    throw micro.createError(400, 'Invalid parameters\n')
  }

  return params
}

function send(context: HttpContext, code: number, obj: any = null) {
  const { res } = context
  res.statusCode = code

  if (obj === null || obj === undefined) {
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
    case 'boolean':
      jsonify = true
      break
    case 'string':
      jsonify = context.accepts('text', 'json') === 'json'
      break
    default:
      throw micro.createError(500, 'Unexpected return type\n')
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
  } else {
    if (!res.getHeader('Content-Type')) {
      // TODO: why does this seem to be necessary when using text/plain?
      if (typeof str === 'string' && !str.endsWith('\n')) {
        str += '\n'
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    }
  }

  res.setHeader('Content-Length', Buffer.byteLength(str))
  res.end(str)
}

function sendError(context: HttpContext, error: Error, statusCode?: number) {
  /* tslint:disable no-string-literal */
  if (statusCode || error['statusCode'] === undefined) {
    error['statusCode'] = statusCode || 500
  }
  /* tslint:enable no-string-literal */
  micro.sendError(context.req, context.res, error)
}
