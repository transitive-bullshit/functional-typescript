import contentType from 'content-type'
import fileType from 'file-type'
import fs from 'fs'
import { Definition } from 'fts'
import { createValidator } from 'fts-validator'
import http from 'http'
import inflate from 'inflation'
import { readable } from 'is-stream'
import * as micro from 'micro'
import microCORS = require('micro-cors')
import mime from 'mime-types'
import multiparty from 'multiparty'
import raw = require('raw-body')
import { Stream } from 'stream'
import formParser from 'urlencoded-body-parser'

import { HttpContext } from './http-context'
import { requireHandlerFunction } from './require-handler-function'

const DEV = process.env.NODE_ENV === 'development'
const BODY_SIZE_LIMIT = '100mb'

interface Options {
  debug: boolean
  cors: {
    allowMethods: string[]
  }
}

export function createHttpHandler(
  definition: Definition,
  jsFilePathOrModule: string | object,
  opts: Partial<Options> = {}
) {
  const {
    debug = false,
    cors = {
      allowMethods: ['GET', 'POST', 'OPTIONS', 'HEAD']
    }
  } = opts

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

    getParams(context, definition, debug)
      .then((params: any) => {
        let args: any[] = []

        if (definition.params.http) {
          if (definition.params.order.length) {
            args = [params]
          }

          if (definition.params.context) {
            args.push(context)
          }
        } else {
          const hasValidParams = validateParams(params)
          if (!hasValidParams) {
            const message = validator.ajv.errorsText(validateParams.errors)
            sendError(context, new Error(message), 400)
            return
          }

          args = definition.params.order.map((name) => params[name])
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

  return microCORS(cors)(handler)
}

async function getParams(
  context: HttpContext,
  definition: Definition,
  debug: boolean
): Promise<any> {
  if (definition.params.http) {
    if (!definition.params.order.length) {
      return null
    } else {
      if (debug) {
        console.log(
          'fts-http',
          'headers',
          JSON.stringify(context.req.headers, null, 2)
        )
      }

      return getBody(context)
    }
  } else {
    let params: any = {}

    if (context.req.method === 'GET') {
      params = context.query
    } else if (context.req.method === 'POST') {
      if (context.is('multipart/form-data')) {
        const form = new multiparty.Form()

        // TODO: clean this up
        params = await new Promise((resolve, reject) => {
          form.parse(context.req, (err, fields, files) => {
            if (err) {
              return reject(err)
            }

            // TODO: I believe field values are assumed to be strings but should
            // probably be parsed as json?

            for (const key in files) {
              if (!files.hasOwnProperty(key)) {
                continue
              }

              const file = files[key][0]
              if (!file) {
                continue
              }

              let v: string | Buffer = fs.readFileSync(file.path)
              let m = 'application/octet-stream'
              const ct = file.headers['content-type']
              let charset: string

              if (ct) {
                const c = contentType.parse(ct)
                if (c) {
                  m = c.type
                  charset = c.parameters.charset
                }
              } else {
                const f = fileType(v)
                if (f) {
                  m = f.mime
                }
              }

              if (!charset) {
                charset = mime.charset(m)
              }

              if (charset) {
                v = v.toString(charset)
              }

              fields[key] = v
            }

            resolve(fields)
          })
        })
      } else if (context.is('application/x-www-form-urlencoded')) {
        params = await formParser(context.req, {
          limit: BODY_SIZE_LIMIT
        })
      } else {
        const body = await getBody(context)
        return JSON.parse(body.toString('utf8'))
      }
    } else {
      throw micro.createError(501, 'Not implemented\n')
    }

    if (typeof params !== 'object') {
      throw micro.createError(400, 'Invalid parameters\n')
    }

    return params
  }
}

async function getBody(context: HttpContext): Promise<Buffer> {
  const opts: any = {}
  const len = context.req.headers['content-length']
  const encoding = context.req.headers['content-encoding'] || 'identity'
  if (len && encoding === 'identity') {
    opts.length = +len
    opts.limit = BODY_SIZE_LIMIT
  }
  return (raw(inflate(context.req), opts) as unknown) as Promise<Buffer>
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
