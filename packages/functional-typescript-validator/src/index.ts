import Ajv from 'ajv'
import cloneDeep from 'clone-deep'

const encoding = 'base64'

const customCoercionTypes = {
  Buffer: {
    // decode
    to: (data: string): Buffer => {
      return Buffer.from(data, encoding)
    },

    // encode
    from: (data: Buffer): string => {
      return data.toString(encoding)
    }
  },

  Date: {
    // decode
    to: (data: string): Date => {
      const date = new Date(data)
      if (isNaN(date as any)) {
        throw new Error(`Invalid Date "${data}"`)
      }

      return date
    },

    // encode
    from: (data: Date): string => {
      return data.toISOString()
    }
  }
}

export interface Validator {
  ajv: Ajv.Ajv
  decoder: (schema: any) => Ajv.ValidateFunction
  encoder: (schema: any) => Ajv.ValidateFunction
}

export function createValidator(opts?: any): Validator {
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

/**
 * Performs **decoding** during schema validation of non-JSON-primitive data
 * types from serialized string representations to their native JavaScript types.
 *
 * Used for converting from ISO utf8 strings to JS Date objects.
 * Used for converting from base64-encoded strings to JS Buffer objects.
 */
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

/**
 * Performs **encoding** during schema validation of non-JSON-primitive data
 * types from their native JavaScript types to serialized string representations.
 *
 * Used for converting from JS Date objects to ISO utf8 strings.
 * Used for converting from JS Buffer objects to base64-encoded strings.
 */
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
