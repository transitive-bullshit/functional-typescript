import http from 'http'
import micro from 'micro'
import { parseEndpoint } from './parse-endpoint'
import { HttpHandler, HttpServerOptions } from './types'

/**
 * Small wrapper around [micro](https://github.com/zeit/micro) for creating
 * an http server that wraps for a single HttpHandler function.
 */
export async function createHttpServer(
  handler: HttpHandler,
  endpointOrPort?: string | number,
  options: Partial<HttpServerOptions> = {}
): Promise<http.Server> {
  const opts: HttpServerOptions = {
    silent: false,
    serve: micro,
    ...options
  }
  const server = opts.serve(handler)
  const parsedEndpoint = parseEndpoint(endpointOrPort)
  const log = opts.silent ? noop : console.log.bind(console)

  return new Promise((resolve, reject) => {
    server.on('error', (err: Error) => {
      log('fts:', err.stack)
      reject(err)
    })

    server.listen(...parsedEndpoint, () => {
      const details = server.address()

      registerShutdown(() => server.close())

      if (typeof details === 'string') {
        log(`fts: Accepting connections on ${details}`)
      } else if (typeof details === 'object' && details.port) {
        log(`fts: Accepting connections on port ${details.port}`)
      } else {
        log('fts: Accepting connections')
      }

      resolve(server)
    })
  })
}

function registerShutdown(cb: () => any) {
  let run = false

  const wrapper = () => {
    if (!run) {
      run = true
      cb()
    }
  }

  process.on('SIGINT', wrapper)
  process.on('SIGTERM', wrapper)
  process.on('exit', wrapper)
}

function noop() {
  return undefined
}
