import Ajv from 'ajv'
import cloneDeep from 'clone-deep'
import * as FTS from './types'

const encoding = 'base64'

const customCoercionTypes = {
  Buffer: {
    to: (data: string): Buffer => {
      return Buffer.from(data, encoding)
    },

    from: (data: Buffer): string => {
      return data.toString(encoding)
    }
  },

  Date: {
    // decode
    // params: invoke locally
    // params: invoke remotely
    // returns: parse remote result?
    to: (data: string): Date => {
      const date = new Date(data)
      if (isNaN(date as any)) {
        throw new Error(`Invalid Date "${data}"`)
      }

      return date
    },

    // http-handler(definition, jsFilePath, opts)
    // http-client(definition, endpoint, opts)

    // encode
    // params: parse params locally?
    // returns: parse result locally
    // returns: parse result remotely
    from: (data: Date): string => {
      return data.toISOString()
    }
  }
}

export function createValidator(opts?: any): FTS.Validator {
  const ajv = new Ajv({ useDefaults: true, coerceTypes: true, ...opts })
  ajv.addKeyword('coerceTo', coerceToKeyword)
  ajv.addKeyword('coerceFrom', coerceFromKeyword)

  return {
    ajv,
    decoder: (schema: any): Ajv.ValidateFunction => {
      const temp = cloneDeep(schema)
      convertSchema(temp, (schema, key) => {
        if (key === 'coerceFrom') {
          const type = schema[key]
          delete schema[key]
          schema.coerceTo = type
          if (type === 'date') {
            schema.format = 'date-time'
          }
          schema.type = 'string'
        }
      })
      return ajv.compile(temp)
    },
    encoder: (schema: any): Ajv.ValidateFunction => {
      const temp = cloneDeep(schema)
      convertSchema(temp, (schema, key) => {
        if (key === 'coerceTo') {
          const type = schema[key]
          delete schema[key]
          schema.coerceFrom = type
          if (type === 'date') {
            delete schema.format
          }
          schema.type = 'object'
        }
      })
      return ajv.compile(temp)
    }
  }
}

function convertSchema(
  schema: any,
  transform: (schema: any, key: string) => void
): any {
  for (const key in schema) {
    if (schema.hasOwnProperty(key)) {
      transform(schema, key)

      const value = schema[key]
      if (typeof value === 'object') {
        convertSchema(value, transform)
      }
    }
  }
}

const coerceToKeyword: Ajv.KeywordDefinition = {
  type: 'string',
  modifying: true,
  errors: true,
  compile: (schema: any): Ajv.ValidateFunction => {
    const coercionType = customCoercionTypes[schema]
    if (!coercionType) {
      throw new Error(`Invalid coerceTo "${schema}"`)
    }

    const coerceToType: (data: any) => any = coercionType.to

    return function coerceTo(
      data: string,
      dataPath: string,
      parentData: object | any[],
      parentDataProperty: string | number
    ): boolean {
      if (!parentData || !dataPath) {
        // TODO: support modifying "bare" types
        throw new Error(
          `Invalid coerceTo "${schema}" must be contained in object or array`
        )
      }

      try {
        const transformedData = coerceToType(data)
        if (!transformedData) {
          return false
        }

        parentData[parentDataProperty] = transformedData
        return true
      } catch (err) {
        this.errors = [err]
        return false
      }
    }
  }
}

const coerceFromKeyword: Ajv.KeywordDefinition = {
  type: 'object',
  modifying: true,
  errors: true,
  compile: (schema: any): Ajv.ValidateFunction => {
    const coercionType = customCoercionTypes[schema]
    if (!coercionType) {
      throw new Error(`Invalid coerceFrom "${schema}"`)
    }

    const coerceFromType: (data: any) => any = coercionType.from

    return function coerceFrom(
      data: object,
      dataPath: string,
      parentData: object | any[],
      parentDataProperty: string | number
    ): boolean {
      if (!parentData || !dataPath) {
        // TODO: support modifying "bare" types
        throw new Error(
          `Invalid coerceFrom "${schema}" must be contained in object or array`
        )
      }

      try {
        const transformedData = coerceFromType(data)
        if (!transformedData) {
          return false
        }

        parentData[parentDataProperty] = transformedData
        return true
      } catch (err) {
        this.errors = [err]
        return false
      }
    }
  }
}
