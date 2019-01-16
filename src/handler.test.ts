import test from 'ava'
import * as fs from 'fs-extra'
// import * as globby from 'globby'
import jsf from 'json-schema-faker'
import * as path from 'path'
import * as tempy from 'tempy'
import * as FTS from '.'

const fixtures = ['./fixtures/address-book.ts'] // globby.sync('./fixtures/**/*.ts')

for (const fixture of fixtures) {
  const pathInfo = path.parse(fixture)

  test(pathInfo.name, async (t) => {
    const outDir = tempy.directory()
    const definition = await FTS.generateDefinition(fixture, {
      compilerOptions: {
        outDir
      },
      emit: true
    })
    t.truthy(definition)

    const jsFilePath = path.join(outDir, `${pathInfo.name}.js`)
    const handler = FTS.createHttpHandler(definition, jsFilePath)
    t.is(typeof handler, 'function')

    // TODO: test invoking handler with mock req/res

    jsf.option({ alwaysFakeOptionals: true })
    const params = await jsf.resolve(definition.params.schema)

    await fs.rmdir(outDir)
  })
}
