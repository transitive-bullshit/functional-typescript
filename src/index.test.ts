import Ajv from 'ajv'
import test from 'ava'
import * as globby from 'globby'
import * as path from 'path'
import * as FTS from '.'

const fixtures = globby.sync('./fixtures/**/*.ts')
const ajv = new Ajv()

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test(name, async (t) => {
    const schema = await FTS.generateSchema(fixture)
    t.truthy(schema)

    ajv.validateSchema(schema)
    t.is(ajv.errors, null)
    t.snapshot(schema)
  })
}
