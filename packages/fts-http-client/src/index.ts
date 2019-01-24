import { Definition } from 'fts'
import { createValidator } from 'fts-validator'
import fetch from 'isomorphic-unfetch'

export function createHttpClient(definition: Definition, url: string) {
  const { title } = definition
  const requiredParams = getRequiredParams(definition.params.schema)

  const validator = createValidator()
  const paramsEncoder = validator.encoder(definition.params.schema)
  const returnsDecoder = validator.decoder(definition.returns.schema)

  return async (...args: any[]) => {
    let setParams = false
    let params: any

    if (args.length > definition.params.order.length) {
      throw new Error(
        `Invalid parameters to "${title}": too many parameters. Expected ${
          definition.params.order.length
        }, received ${args.length}.`
      )
    }

    if (args.length === 1 && typeof args[0] === 'object') {
      const arg = args[0]
      const firstParamName = definition.params.order[0]

      if (firstParamName) {
        const firstParam = definition.params.schema.properties[firstParamName]
        const isCustomType = firstParam.type === 'string' && firstParam.coerceTo
        let isParamsObject = true

        if (Buffer.isBuffer(arg) || Array.isArray(arg) || arg instanceof Date) {
          isParamsObject = false
        } else if (
          firstParam.type === 'object' ||
          firstParam.$ref ||
          isCustomType
        ) {
          for (const param of requiredParams) {
            if (!arg.hasOwnProperty(param)) {
              isParamsObject = false
            }
          }
        }

        if (isParamsObject) {
          params = arg
          setParams = true
        }
      }
    }

    if (!setParams) {
      params = args.reduce((acc, param, i) => {
        const name = definition.params.order[i]
        if (name) {
          acc[name] = param
        }
        return acc
      }, {})
    }

    paramsEncoder(params)
    if (paramsEncoder.errors) {
      const message = validator.ajv.errorsText(paramsEncoder.errors)
      throw new Error(`Invalid parameters: ${message}`)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const returns = { result: await response.json() }
    returnsDecoder(returns)

    return returns.result
  }
}

function getRequiredParams(schema: any): string[] {
  return schema.required.filter(
    (name: string) => !schema.properties[name].hasOwnProperty('default')
  )
}
