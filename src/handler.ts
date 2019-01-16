import Ajv from 'ajv'
import * as cors from 'cors'
import * as micro from 'micro'
import * as qs from 'qs'
import * as url from 'url'
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
  const ajv = new Ajv()
  const validateParams = ajv.compile(definition.params)
  // const validateReturn = ajv.compile(definition.return)

  const opts: FTS.HttpHandlerOptions = {
    ...options
  }

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

  const handler = (req, res) => {
    const urlinfo = url.parse(req.url)
    const query = qs.parse(urlinfo.query)
    let params: any = {}

    if (req.method === 'GET') {
      params = query
    }

    const isValid = validateParams(params)
    if (!isValid) {
      const message = ajv.errorsText(validateParams.errors)
      const error = new Error(message)
      error.statusCode = 400
      return micro.sendError(req, res, error)
    }

    // TODO: need array for params ordering

    res.setHeader('content-type', 'text/plain')
    res.end(`The current time is ${new Date()}`)
  }

  // cors.default(opts.cors, handler)
  return handler
}
