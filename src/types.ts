import * as cors from 'cors'
import * as doctrine from 'doctrine'
import * as http from 'http'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'

export interface Config {
  language: string
  async: boolean
  context: boolean
  defaultExport: boolean
  namedExport?: string
}

export interface Definition {
  title: string
  description?: string
  config: Config

  /** JSON Schema describing function parameters. */
  params: TJS.Definition

  /** JSON Schema describing function return type. */
  return: TJS.Definition
}

export interface DefinitionBuilder {
  sourceFile: TS.SourceFile
  main: TS.FunctionDeclaration
  docs?: doctrine.Annotation
  title: string
  definition: Partial<Definition>
}

export interface Context {
  readonly headers: http.IncomingHttpHeaders
  readonly ip: string
  readonly url: string
  readonly user?: string
  set(name: string, value: number | string | string[]): void

  // TODO: this needs work
}

export type HttpHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void

export interface HttpHandlerOptions {
  cors?: cors.CorsOptions
}
