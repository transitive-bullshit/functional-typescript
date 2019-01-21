import Ajv from 'ajv'
import test from 'ava'
import globby from 'globby'
import path from 'path'
import * as FTS from '.'

const fixtures = globby.sync('./fixtures/**/*.{js,ts}')
const ajv = new Ajv()

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test(name, async (t) => {
    const definition = await FTS.generateDefinition(fixture)
    t.truthy(definition)

    t.true(Array.isArray(definition.params.order))
    ajv.validateSchema(definition.params.schema)
    t.is(ajv.errors, null)

    ajv.validateSchema(definition.returns)
    t.is(ajv.errors, null)

    t.snapshot(definition)
  })
}
