import test from 'ava'
import * as globby from 'globby'
import * as path from 'path'
// import * as FTS from '.'

const fixtures = globby.sync('./fixtures/**/*.ts')

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test(name, async (t) => {
    // const definition = await FTS.generateDefinition(fixture)
    t.truthy(true)

    // TODO
  })
}
