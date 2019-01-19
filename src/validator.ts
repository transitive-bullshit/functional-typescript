import Ajv from 'ajv'

const encoding = 'base64'

const customCoercionTypes = {
  Buffer: (data: any): Buffer => {
    return Buffer.from(data, encoding)
  },

  Date: (data: any): Date => {
    const date = new Date(data)
    if (isNaN(date as any)) {
      throw new Error(`Invalid Date "${data}"`)
    }

    return date
  }
}

export function createJsonSchemaValidator(opts?: any): Ajv.Ajv {
  const ajv = new Ajv({ useDefaults: true, coerceTypes: true, ...opts })
  ajv.addKeyword('coerceTo', coerceToKeyword)
  return ajv
}

const coerceToKeyword: Ajv.KeywordDefinition = {
  type: 'string',
  modifying: true,
  errors: true,
  compile: (schema: any): Ajv.ValidateFunction => {
    const coercionType: (schema: any) => any = customCoercionTypes[schema]
    if (!coercionType) {
      throw new Error(`Invalid coerceTo "${schema}"`)
    }

    return function coerceTo(
      data: any,
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
        const transformedData = coercionType(data)
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
