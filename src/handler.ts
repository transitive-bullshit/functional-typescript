import Ajv from 'ajv'
// import * as cors from 'cors'
import * as http from 'http'
import { readable } from 'is-stream'
import * as micro from 'micro'
import { Stream } from 'stream'
import * as FTS from './types'

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
    throw new Error(
      `Invalid FTS definition "${definition.title}"; empty JS module require.`
    )
  }

  if (definition.config.defaultExport) {
    if (typeof entryPoint !== 'function') {
      entryPoint = entryPoint.default
    }
  } else {
    if (!definition.config.namedExport) {
      throw new Error(
        `Invalid FTS definition "${
          definition.title
        }"; must have either a defaultExport or namedExport.`
      )
    }

    entryPoint = entryPoint[definition.config.namedExport]

    if (!entryPoint) {
      throw new Error(
        `Invalid FTS definition "${definition.title}"; JS export "${
          definition.config.namedExport
        }" doesn't exist.`
      )
    }
  }

  if (typeof entryPoint !== 'function') {
    throw new Error(
      `Invalid FTS definition "${
        definition.title
      }"; referenced JS export is not a function.`
    )
  }

  const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const context = new FTS.HttpContext(req, res)
    let params: any = {}

    if (req.method === 'GET') {
      params = context.query
    } else {
      // TODO: handle
      sendError(context, new Error('TODO: support more HTTP methods'))
      return
    }

    const hasValidParams = validateParams(params)
    if (!hasValidParams) {
      const message = ajv.errorsText(validateParams.errors)
      sendError(context, new Error(message), 400)
      return
    }

    const args = definition.params.order.map((name) => params[name])
    if (definition.params.context) {
      args.push(context)
    }

    try {
      Promise.resolve(entryPoint(...args))
        .then((result: any) => {
          const isValidReturnType = validateReturns(result)
          if (!isValidReturnType) {
            const message = ajv.errorsText(validateReturns.errors)
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
          return
        })
    } catch (err) {
      sendError(context, err, 500)
      return
    }
  }

  // cors.default(opts.cors, handler)
  return handler
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
    // We stringify before setting the header
    // in case `JSON.stringify` throws and a
    // 500 has to be sent instead

    // the `JSON.stringify` call is split into
    // two cases as `JSON.stringify` is optimized
    // in V8 if called with only one argument
    str = DEV ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)

    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
  }

  res.setHeader('Content-Length', Buffer.byteLength(str))
  res.end(str)
}

function sendError(context: FTS.HttpContext, error: Error, statusCode = 500) {
  /* tslint:disable no-string-literal */
  error['statusCode'] = statusCode
  /* tslint:enable no-string-literal */
  console.error(error)
  micro.sendError(context.req, context.res, error)
}
