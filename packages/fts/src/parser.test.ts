import Ajv from 'ajv'
import test from 'ava'
import globby from 'globby'
import path from 'path'
import { generateDefinition } from '.'

// const fixtures = ['./fixtures/http-response.ts']
const fixtures = globby.sync('./fixtures/**/*.{js,ts}')
const ajv = new Ajv()

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test(name, async (t) => {
    const definition = await generateDefinition(fixture)
    t.truthy(definition)

    t.true(Array.isArray(definition.params.order))
    t.true(ajv.validateSchema(definition.params.schema))
    t.is(ajv.errors, null)

    t.true(ajv.validateSchema(definition.returns.schema))
    t.is(ajv.errors, null)

    // package version updates shouldn't affect snapshots
    delete definition.version

    t.snapshot(definition)
  })
}
