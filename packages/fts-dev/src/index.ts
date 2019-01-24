import { generateDefinition } from 'fts'
import { createHttpHandler, createHttpServer } from 'fts-http'
import http from 'http'
import path from 'path'
import tempy from 'tempy'

export class DevServerOptions {
  port: number = 3000
}

export async function createDevServer(
  file: string,
  options: Partial<DevServerOptions> = {}
): Promise<http.Server> {
  const opts = {
    ...new DevServerOptions(),
    ...options
  }

  file = path.resolve(file)
  const { name } = path.parse(file)
  const outDir = tempy.directory()
  const definition = await generateDefinition(file, {
    compilerOptions: {
      outDir
    },
    emit: true
  })
  console.log(definition)

  const jsFilePath = path.join(outDir, `${name}.js`)
  const handler = createHttpHandler(definition, jsFilePath)

  return createHttpServer(handler, opts.port, { silent: false })
}
