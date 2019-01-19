import Ajv from 'ajv'

const customCoercionTypes = {
  Buffer: (maybeBuffer: any): Buffer => {
    return Buffer.from(maybeBuffer)
  },

  Date: (maybeDate: any): Date => {
    const date = new Date(maybeDate)
    if (isNaN(date as any)) {
      throw new Error(`Invalid Date "${maybeDate}"`)
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
  errors: false,
  modifying: true,
  valid: true,
  compile: (schema: any): Ajv.ValidateFunction => {
    const coercionType: (schema: any) => any = customCoercionTypes[schema]
    return (
      data: any,
      dataPath: string,
      parentData: object | any[],
      parentDataProperty: string | number
    ): boolean => {
      if (!parentData || !dataPath) {
        return false
      }

      const transformedData = coercionType(data)
      if (!transformedData) {
        return false
      }

      parentData[parentDataProperty] = transformedData
      return true
    }
  }
}
