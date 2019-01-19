import test from 'ava'
import { createJsonSchemaValidator } from './validator'

test('basic', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'number'
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    pi: 3.14159
  }

  validate(data)
  t.is(validator.errors, null)
  t.deepEqual(data, {
    pi: 3.14159
  })
  t.is(typeof data.pi, 'number')
})

test('coerceTo: Date valid object', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        coerceTo: 'Date'
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    foo: '2019-01-19T20:42:45.310Z'
  }

  validate(data)
  t.is(validator.errors, null)
  t.true((data.foo as any) instanceof Date)
})

test('coerceTo: Date valid array', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'array',
        items: {
          type: 'string',
          coerceTo: 'Date'
        }
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    foo: ['2019-01-19T20:42:45.310Z', '2019-01-19T20:55:23.733Z']
  }

  validate(data)
  t.is(validator.errors, null)
  t.true((data.foo[0] as any) instanceof Date)
  t.true((data.foo[1] as any) instanceof Date)
})

test('coerceTo: Date invalid object', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        coerceTo: 'Date'
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    foo: 'invalid date'
  }

  t.false(validate(data))
})

test('coerceTo: Date invalid array', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'array',
        items: {
          type: 'string',
          coerceTo: 'Date'
        }
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    foo: ['foo', 'bar']
  }

  t.false(validate(data))
})

test('coerceTo: Date invalid bare', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'string',
    coerceTo: 'Date'
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = '2019-01-19T20:42:45.310Z'

  t.throws(() => validate(data))
})

test('coerceTo: Buffer valid object', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        coerceTo: 'Buffer'
      }
    }
  }

  const validator = createJsonSchemaValidator()
  const validate = validator.compile(schema)

  const data = {
    foo: Buffer.from('hello world').toString('base64')
  }

  validate(data)
  t.is(validator.errors, null)
  t.true(Buffer.isBuffer(data.foo))
  t.is(data.foo.toString(), 'hello world')
})
