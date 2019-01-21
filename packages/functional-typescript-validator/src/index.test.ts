import test from 'ava'
import { createValidator } from '.'

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

  const validator = createValidator()
  const decoder = validator.decoder(schema)
  const encoder = validator.encoder(schema)

  const data = {
    pi: 3.14159
  }

  decoder(data)
  t.is(decoder.errors, null)
  t.deepEqual(data, { pi: 3.14159 })
  t.is(typeof data.pi, 'number')

  encoder(data)
  t.is(encoder.errors, null)
  t.deepEqual(data, { pi: 3.14159 })
  t.is(typeof data.pi, 'number')
})

test('decode/encode Date valid object', async (t) => {
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

  const validator = createValidator()
  const decoder = validator.decoder(schema)
  const encoder = validator.encoder(schema)

  const data = {
    foo: '2019-01-19T20:42:45.310Z'
  }

  decoder(data)
  t.is(decoder.errors, null)
  t.true((data.foo as any) instanceof Date)

  encoder(data)
  t.is(encoder.errors, null)
  t.is(typeof data.foo, 'string')
})

test('decode/encode Date valid array', async (t) => {
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

  const validator = createValidator()
  const decoder = validator.decoder(schema)
  const encoder = validator.encoder(schema)

  const data = {
    foo: ['2019-01-19T20:42:45.310Z', '2019-01-19T20:55:23.733Z']
  }

  decoder(data)
  t.is(decoder.errors, null)
  t.true((data.foo[0] as any) instanceof Date)
  t.true((data.foo[1] as any) instanceof Date)

  encoder(data)
  t.is(encoder.errors, null)
  t.is(typeof data.foo[0], 'string')
  t.is(typeof data.foo[1], 'string')
})

test('decode Date invalid object', async (t) => {
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

  const validator = createValidator()
  const decoder = validator.decoder(schema)

  const data = {
    foo: 'invalid date'
  }

  t.false(decoder(data))
})

test('decode Date invalid array', async (t) => {
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

  const validator = createValidator()
  const decoder = validator.decoder(schema)

  const data = {
    foo: ['foo', 'bar']
  }

  t.false(decoder(data))
})

test('decode Date invalid bare', async (t) => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'string',
    coerceTo: 'Date'
  }

  const validator = createValidator()
  const decoder = validator.decoder(schema)

  const data = '2019-01-19T20:42:45.310Z'

  t.throws(() => decoder(data))
})

test('decode/encode Buffer valid object', async (t) => {
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

  const validator = createValidator()
  const decoder = validator.decoder(schema)
  const encoder = validator.encoder(schema)

  const data = {
    foo: Buffer.from('hello world').toString('base64')
  }

  decoder(data)
  t.is(decoder.errors, null)
  t.true(Buffer.isBuffer(data.foo))
  t.is(data.foo.toString(), 'hello world')

  encoder(data)
  t.is(encoder.errors, null)
  t.is(typeof data.foo, 'string')
  t.is(Buffer.from(data.foo, 'base64').toString(), 'hello world')
})
