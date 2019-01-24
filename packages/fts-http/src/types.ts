import cors from 'cors'
import http from 'http'

export type HttpHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void

export interface HttpHandlerOptions {
  cors?: cors.CorsOptions
}

export interface HttpServerOptions {
  silent: boolean
  serve(fn: HttpHandler): http.Server
}

export type Func = (...args: any[]) => any
