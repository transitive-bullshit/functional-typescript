import doctrine from 'doctrine'
import * as TS from 'ts-morph'
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

  // consumes: MimeTypes
  // produces: MimeTypes

  params: {
    /** JSON Schema describing the function parameters */
    schema: TJS.Definition

    /** Ordering of the function parameters */
    order: string[]

    /** Enables a fallback to disable type-checking for raw HTTP requests */
    http: boolean

    /** Whether or not the function takes in a context parameter */
    context: boolean
  }

  returns: {
    /** JSON Schema describing the function return type */
    schema: TJS.Definition

    /** Whether or not the function returns an async Promise */
    async: boolean

    /** Enables a fallback to disable type-checking for raw HTTP responses */
    http: boolean
  }
}

// export type MimeTypes = string[]

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
