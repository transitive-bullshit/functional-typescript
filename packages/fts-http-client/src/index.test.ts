import test from 'ava'
import nock from 'nock'
import { createHttpClient } from '.'
import fixtures from './fixtures.json'

const hostname = 'https://nala.com'
const path = '/123'
const url = `${hostname}${path}`

test('hello-world', async (t) => {
  const definition = fixtures['hello-world']
  const client = createHttpClient(definition, url)

  {
    nock(hostname)
      .post(path, { name: 'World' })
      .reply(200, '"Hello World!"')

    const result = await client()
    t.is(result, 'Hello World!')
  }

  {
    nock(hostname)
      .post(path, { name: 'Foo' })
      .reply(200, '"Hello Foo!"')

    const result = await client({ name: 'Foo' })
    t.is(result, 'Hello Foo!')
  }

  {
    nock(hostname)
      .post(path, { name: 'Bar' })
      .reply(200, '"Hello Bar!"')

    const result = await client('Bar')
    t.is(result, 'Hello Bar!')
  }

  await t.throwsAsync(() => client('Foo', 'Bar'))
})
