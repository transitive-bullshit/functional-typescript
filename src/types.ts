import * as cors from 'cors'
import * as doctrine from 'doctrine'
import * as http from 'http'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'

/**
 * Core FTS function definition that fully specifies the configuration, parameters,
 * and return type for an FTS function.
 */
export interface Definition {
  /** Name of the function */
  title: string

  /** Brief description of the function */
  description?: string

  /** Language and runtime-specific information */
  config: Config

  /** FTS version that generated this definition */
  version: string

  params: {
    /** JSON Schema describing the function parameters */
    schema: TJS.Definition

    /** Ordering of the function parameters */
    order: string[]

    /** Whether or not the function takes in a context parameter */
    context: boolean
  }

  returns: {
    /** JSON Schema describing the function return type */
    schema: TJS.Definition

    /** Whether or not the function returns an async Promise */
    async: boolean
  }
}

export interface Config {
  language: string
  defaultExport: boolean
  namedExport?: string
}

export interface DefinitionOptions {
  emit?: boolean
  emitOptions?: TS.EmitOptions
  compilerOptions?: TS.CompilerOptions
  jsonSchemaOptions?: TJS.PartialArgs
}

export type PartialDefinitionOptions = Partial<DefinitionOptions>

export interface DefinitionBuilder {
  sourceFile: TS.SourceFile
  main: TS.FunctionDeclaration
  docs?: doctrine.Annotation
  title: string
  definition: Partial<Definition>
}

export type HttpHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void

export interface HttpHandlerOptions {
  cors?: cors.CorsOptions
}

export * from './context'
export * from './http-context'
