import test from 'ava'
import fs from 'fs-extra'
import { generateDefinition } from 'fts'
import getPort from 'get-port'
import globby from 'globby'
import got from 'got'
import path from 'path'
import pify from 'pify'
import tempy from 'tempy'
import * as HTTP from '.'

const fixtures = globby.sync('./fixtures/hello-world.ts')

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test.serial(name, async (t) => {
    const outDir = tempy.directory()
    const definition = await generateDefinition(fixture, {
      compilerOptions: {
        outDir
      },
      emit: true
    })
    t.truthy(definition)

    const jsFilePath = path.join(outDir, `${name}.js`)
    const handler = HTTP.createHttpHandler(definition, jsFilePath)
    t.is(typeof handler, 'function')

    const port = await getPort()
    const server = await HTTP.createHttpServer(handler, port)
    const url = `http://localhost:${port}`

    const res = await got(url, { method: 'options' })
    t.truthy(res)
    t.is(res.statusCode, 200)
    t.is(res.body, 'ok\n')

    await pify(server.close.bind(server))()
    await fs.remove(outDir)
  })
}
