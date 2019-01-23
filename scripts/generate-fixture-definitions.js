import Ajv from 'ajv'
import assert from 'assert'
import globby from 'globby'
import path from 'path'
import pMap from 'p-map'
import { generateDefinition } from 'fts'

const fixtures = globby.sync('../fixtures/**/*.{js,ts}', { cwd: __dirname })
  .map((fixture) => path.resolve(__dirname, fixture))

async function generateFixtureDefinitions () {
  const definitions = { }
  const ajv = new Ajv()

  console.error(`generating fts definition for ${fixtures.length} fixtures...`)

  await pMap(fixtures, async (fixture) => {
    const { name } = path.parse(fixture)
    console.error(`generating fts definition for "${name}"...`, fixture)
    const definition = await generateDefinition(fixture)

    assert(Array.isArray(definition.params.order))
    assert(ajv.validateSchema(definition.params.schema))
    assert.equal(ajv.errors, null)

    assert(ajv.validateSchema(definition.returns.schema))
    assert.equal(ajv.errors, null)

    definitions[name] = definition
  }, {
    concurrency: 4
  })

  return definitions
}

generateFixtureDefinitions()
  .then((definitions) => {
    console.log(JSON.stringify(definitions, null, 2))
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
