// TODO: parser would be ~2x faster if we reused the underlying ts program from TS in TJS

import doctrine from 'doctrine'
import fs from 'fs-extra'
import { version } from 'fts-core'
import path from 'path'
import tempy from 'tempy'
import * as TS from 'ts-morph'
import * as TJS from 'typescript-json-schema'
import * as FTS from './types'

const FTSReturns = 'FTSReturns'
const FTSParams = 'FTSParams'

const promiseTypeRe = /^Promise<(.*)>$/

const supportedExtensions = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript'
}

export async function generateDefinition(
  file: string,
  options: FTS.PartialDefinitionOptions = {}
): Promise<FTS.Definition> {
  file = path.resolve(file)
  const fileInfo = path.parse(file)
  const language = supportedExtensions[fileInfo.ext.substr(1)]

  if (!language) {
    throw new Error(`File type "${fileInfo.ext}" not supported. "${file}"`)
  }

  const outDir = tempy.directory()

  // initialize and compile TS program
  const compilerOptions = {
    allowJs: true,
    ignoreCompilerErrors: true,
    // TODO: why do we need to specify the full filename for these lib definition files?
    lib: ['lib.es2018.d.ts', 'lib.dom.d.ts'],
    target: TS.ScriptTarget.ES5,
    outDir,
    ...(options.compilerOptions || {})
  }

  const jsonSchemaOptions = {
    noExtraProps: true,
    required: true,
    validationKeywords: ['coerceTo', 'coerceFrom'],
    ...(options.jsonSchemaOptions || {})
  }

  const definition: Partial<FTS.Definition> = {
    config: {
      defaultExport: true,
      language
    },
    params: {
      context: false,
      order: [],
      schema: null
    },
    returns: {
      async: false,
      http: false,
      schema: null
    },
    version
  }

  const project = new TS.Project({ compilerOptions })

  project.addExistingSourceFile(file)
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  if (diagnostics.length > 0) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

    // TODO: throw error?
  }

  const sourceFile = project.getSourceFileOrThrow(file)
  const main = extractMainFunction(sourceFile, definition)

  if (!main) {
    throw new Error(`Unable to infer a main function export "${file}"`)
  }

  // extract main function type and documentation info
  const title = main.getName ? main.getName() : path.parse(file).name
  const mainTypeParams = main.getTypeParameters()
  definition.title = title

  if (mainTypeParams.length > 0) {
    throw new Error(
      `Generic Type Parameters are not supported for function "${title}"`
    )
  }

  const doc = main.getJsDocs()[0]
  let docs: doctrine.Annotation

  if (doc) {
    const { description } = doc.getStructure()
    docs = doctrine.parse(description as string)
    if (docs.description) {
      definition.description = docs.description
    }
  }

  const builder: FTS.DefinitionBuilder = {
    definition,
    docs,
    main,
    sourceFile,
    title
  }

  if (options.emit) {
    const result = project.emit(options.emitOptions)
    if (result.getEmitSkipped()) {
      throw new Error('emit skipped')
    }
  }

  addParamsDeclaration(builder)
  addReturnTypeDeclaration(builder)

  // TODO: figure out a better workaround than mutating the source file directly
  // TODO: fix support for JS files since you can't save TS in JS
  const tempSourceFilePath = path.format({
    dir: fileInfo.dir,
    ext: '.ts',
    name: `.${fileInfo.name}-fts`
  })
  const tempSourceFile = sourceFile.copy(tempSourceFilePath, {
    overwrite: true
  })
  await tempSourceFile.save()

  try {
    extractJSONSchemas(builder, tempSourceFilePath, jsonSchemaOptions)
  } finally {
    await fs.remove(tempSourceFilePath)
  }

  return builder.definition as FTS.Definition
}

/** Find main exported function declaration */
function extractMainFunction(
  sourceFile: TS.SourceFile,
  definition: Partial<FTS.Definition>
): TS.FunctionDeclaration | undefined {
  const functionDefaultExports = sourceFile
    .getFunctions()
    .filter((f) => f.isDefaultExport())

  if (functionDefaultExports.length === 1) {
    definition.config.defaultExport = true
    return functionDefaultExports[0]
  } else {
    definition.config.defaultExport = false
  }

  const functionExports = sourceFile
    .getFunctions()
    .filter((f) => f.isExported())

  if (functionExports.length === 1) {
    const func = functionExports[0]
    definition.config.namedExport = func.getName()
    return func
  }

  if (functionExports.length > 1) {
    const externalFunctions = functionExports.filter((f) => {
      const docs = f.getJsDocs()[0]

      return (
        docs &&
        docs.getTags().find((tag) => {
          const tagName = tag.getTagName()
          return tagName === 'external' || tagName === 'public'
        })
      )
    })

    if (externalFunctions.length === 1) {
      const func = externalFunctions[0]
      definition.config.namedExport = func.getName()
      return func
    }
  }

  // TODO: arrow function exports are a lil hacky
  const arrowFunctionExports = sourceFile
    .getDescendantsOfKind(TS.SyntaxKind.ArrowFunction)
    .filter((f) => TS.TypeGuards.isExportAssignment(f.getParent()))

  if (arrowFunctionExports.length === 1) {
    const func = arrowFunctionExports[0]
    const exportAssignment = func.getParent() as TS.ExportAssignment
    const exportSymbol = sourceFile.getDefaultExportSymbol()

    // TODO: handle named exports `export const foo = () => 'bar'`
    if (exportSymbol) {
      const defaultExportPos = exportSymbol
        .getValueDeclarationOrThrow()
        .getPos()
      const exportAssignmentPos = exportAssignment.getPos()

      // TODO: better way of comparing nodes
      const isDefaultExport = defaultExportPos === exportAssignmentPos

      if (isDefaultExport) {
        definition.config.defaultExport = true
        return (func as unknown) as TS.FunctionDeclaration
      }
    }
  }

  return undefined
}

function addParamsDeclaration(
  builder: FTS.DefinitionBuilder
): TS.ClassDeclaration {
  const mainParams = builder.main.getParameters()

  const paramsDeclaration = builder.sourceFile.addClass({
    name: FTSParams
  })

  const paramComments = {}

  if (builder.docs) {
    const paramTags = builder.docs.tags.filter((tag) => tag.title === 'param')
    for (const tag of paramTags) {
      paramComments[tag.name] = tag.description
    }
  }

  for (let i = 0; i < mainParams.length; ++i) {
    const param = mainParams[i]
    const name = param.getName()
    const structure = param.getStructure()

    if (structure.isRestParameter) {
      builder.definition.params.schema = { additionalProperties: true }
      continue
    }

    // TODO: this handles alias type resolution i think...
    // need to test multiple levels of aliasing
    structure.type = param.getType().getText()

    if (name === 'context') {
      if (i !== mainParams.length - 1) {
        throw new Error(
          `Function parameter "context" must be last parameter to main function "${
            builder.title
          }"`
        )
      }

      builder.definition.params.context = true
      // TODO: ensure context has valid type `FTS.Context`
      // ignore context in parameter aggregation
      continue
    } else {
      // TODO: ensure that type is valid:
      // not `FTS.Context`
      // not Promise<T>
      // not Function or ArrowFunction
      // not RegExp
    }

    const promiseReMatch = structure.type.match(promiseTypeRe)
    if (promiseReMatch) {
      throw new Error(
        `Parameter "${name}" has unsupported type "${structure.type}"`
      )
    }

    addPropertyToDeclaration(
      paramsDeclaration,
      structure as TS.PropertyDeclarationStructure,
      paramComments[name]
    )
    builder.definition.params.order.push(name)
  }

  return paramsDeclaration
}

function addReturnTypeDeclaration(builder: FTS.DefinitionBuilder) {
  const mainReturnType = builder.main.getReturnType()
  let type = mainReturnType.getText()

  const promiseReMatch = type.match(promiseTypeRe)
  const isAsync = !!promiseReMatch

  builder.definition.returns.async = builder.main.isAsync()

  if (isAsync) {
    type = promiseReMatch[1]
    builder.definition.returns.async = true
  }

  if (type === 'void') {
    type = 'any'
  }

  if (
    type.endsWith('HttpResponse') &&
    (isAsync || mainReturnType.isInterface())
  ) {
    builder.definition.returns.http = true
  }

  const declaration = builder.sourceFile.addInterface({
    name: FTSReturns
  })

  const jsdoc =
    builder.docs &&
    builder.docs.tags.find(
      (tag) => tag.title === 'returns' || tag.title === 'return'
    )
  addPropertyToDeclaration(
    declaration,
    { name: 'result', type },
    jsdoc && jsdoc.description
  )
}

function addPropertyToDeclaration(
  declaration: TS.ClassDeclaration | TS.InterfaceDeclaration,
  structure: TS.PropertyDeclarationStructure,
  jsdoc?: string
): TS.PropertyDeclaration | TS.PropertySignature {
  const isDate = structure.type === 'Date'
  const isBuffer = structure.type === 'Buffer'

  // Type coercion for non-JSON primitives like Date and Buffer
  if (isDate || isBuffer) {
    const coercionType = structure.type

    if (isDate) {
      structure.type = 'Date'
    } else {
      structure.type = 'string'
    }

    jsdoc = `${jsdoc ? jsdoc + '\n' : ''}@coerceTo ${coercionType}`
  }

  const property = declaration.addProperty(structure)

  if (jsdoc) {
    property.addJsDoc(jsdoc)
  }

  return property
}

function extractJSONSchemas(
  builder: FTS.DefinitionBuilder,
  file: string,
  jsonSchemaOptions: TJS.PartialArgs = {},
  jsonCompilerOptions: any = {}
) {
  const compilerOptions = {
    allowJs: true,
    lib: ['es2018', 'dom'],
    target: 'es5',
    ...jsonCompilerOptions
  }

  const program = TJS.getProgramFromFiles(
    [file],
    compilerOptions,
    process.cwd()
  )

  builder.definition.params.schema = {
    ...TJS.generateSchema(program, FTSParams, jsonSchemaOptions),
    ...(builder.definition.params.schema || {}) // Spread any existing schema params
  }

  if (!builder.definition.params.schema) {
    throw new Error(`Error generating params JSON schema for TS file "${file}"`)
  }

  // fix required parameters to only be those which do not have default values
  const { schema } = builder.definition.params
  schema.required = (schema.required || []).filter(
    (k) => schema.properties[k].default === undefined
  )
  if (!schema.required.length) {
    delete schema.required
  }

  builder.definition.returns.schema = TJS.generateSchema(program, FTSReturns, {
    ...jsonSchemaOptions,
    required: false
  })

  if (!builder.definition.returns.schema) {
    throw new Error(
      `Error generating returns JSON schema for TS file "${file}"`
    )
  }
}

/*
// useful for quick testing purposes
if (!module.parent) {
  generateDefinition('./fixtures/medium.ts')
    .then((definition) => {
      console.log(JSON.stringify(definition, null, 2))
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
*/
