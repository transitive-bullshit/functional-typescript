import test from 'ava'
import * as fs from 'fs-extra'
import getPort from 'get-port'
import got from 'got'
// import * as globby from 'globby'
import jsf from 'json-schema-faker'
import * as path from 'path'
import pify from 'pify'
import * as qs from 'qs'
import * as tempy from 'tempy'
import * as FTS from '.'

const fixtures = ['./fixtures/hello-world.ts'] // globby.sync('./fixtures/**/*.ts')

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test(name, async (t) => {
    const outDir = tempy.directory()
    const definition = await FTS.generateDefinition(fixture, {
      compilerOptions: {
        outDir
      },
      emit: true
    })
    t.truthy(definition)

    const jsFilePath = path.join(outDir, `${name}.js`)
    const handler = FTS.createHttpHandler(definition, jsFilePath)
    t.is(typeof handler, 'function')

    const port = await getPort()
    const server = await FTS.createHttpServer(handler, port)
    // TODO: test invoking handler with mock req/res

    jsf.option({ alwaysFakeOptionals: true })
    const params = await jsf.resolve(definition.params.schema)
    const query = qs.stringify(params)

    console.log({ name, params, query, port })
    const response = await got(`http://localhost:${port}`, {
      json: true,
      query
    })
    console.log({
      body: response.body,
      statusCode: response.statusCode
    })
    t.is(response.statusCode, 200)
    t.truthy(response.body)

    await pify(server.close.bind(server))()
    await fs.remove(outDir)
  })
}
