// TODO: parser would be ~2x faster if we reused the ts program from TS in TJS

import arrayEqual from 'array-equal'
import * as doctrine from 'doctrine'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'
import { version } from './package'
import * as FTS from './types'

const FTSReturns = 'FTSReturns'
const FTSParams = 'FTSParams'

export async function generateDefinition(
  file: string,
  options: FTS.PartialDefinitionOptions = {}
): Promise<FTS.Definition> {
  // initialize and compile TS program
  const compilerOptions = {
    ignoreCompilerErrors: true,
    // TODO: why do we need to specify the full filename for these lib definition files?
    // lib: ['lib.es2018.d.ts', 'lib.dom.d.ts'],
    target: TS.ScriptTarget.ES5,
    ...(options.compilerOptions || {})
  }

  const jsonSchemaOptions = {
    defaultProps: true,
    noExtraProps: true,
    required: true,
    ...(options.jsonSchemaOptions || {})
  }

  const definition: Partial<FTS.Definition> = {
    config: {
      defaultExport: true,
      language: 'typescript'
    },
    params: {
      context: false,
      order: [],
      schema: null
    },
    returns: {
      async: false,
      schema: null
    },
    version
  }

  const originalFileContent = await fs.readFile(file, 'utf8')

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
    throw new Error('Unable to infer a main function export')
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
    definition.description = docs.description
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
  addReturnTypeAlias(builder)

  // TODO: figure out a better workaround than mutating the source file directly
  await sourceFile.save()

  try {
    addJSONSchemas(builder, jsonSchemaOptions)
    postProcessDefinition(builder)
  } finally {
    await fs.writeFile(file, originalFileContent, 'utf8')
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
    if (!structure.type) {
      structure.type = param.getType().getText()
    }

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
      // TODO: does json schema handle Date type for us?
    }

    const property = paramsDeclaration.addProperty(
      structure as TS.PropertySignatureStructure
    )

    const comment = paramComments[name]
    if (comment) {
      property.addJsDoc(comment)
    }

    builder.definition.params.order.push(name)
  }

  return paramsDeclaration
}

function addReturnTypeAlias(
  builder: FTS.DefinitionBuilder
): TS.TypeAliasDeclaration {
  const mainReturnType = builder.main.getReturnType()
  let type = mainReturnType.getText()

  const promiseRe = /^Promise<(.*)>$/
  const promiseReMatch = type.match(promiseRe)

  builder.definition.returns.async = builder.main.isAsync()

  if (promiseReMatch) {
    type = promiseReMatch[1]
    builder.definition.returns.async = true
  }

  const typeAlias = builder.sourceFile.addTypeAlias({
    name: FTSReturns,
    type
  })

  if (builder.docs) {
    const returnTag = builder.docs.tags.find(
      (tag) => tag.title === 'returns' || tag.title === 'return'
    )

    if (returnTag) {
      typeAlias.addJsDoc(returnTag)
    }
  }

  return typeAlias
}

function addJSONSchemas(
  builder: FTS.DefinitionBuilder,
  jsonSchemaOptions: TJS.PartialArgs = {},
  jsonCompilerOptions: any = {}
) {
  const compilerOptions = {
    lib: ['es2018', 'dom'],
    target: 'es5',
    ...jsonCompilerOptions
  }

  const program = TJS.getProgramFromFiles(
    [builder.sourceFile.getFilePath()],
    compilerOptions,
    process.cwd()
  )

  builder.definition.params.schema = TJS.generateSchema(
    program,
    FTSParams,
    jsonSchemaOptions
  )

  builder.definition.returns.schema = TJS.generateSchema(
    program,
    FTSReturns,
    jsonSchemaOptions
  )
}

function postProcessDefinition(builder: FTS.DefinitionBuilder) {
  const { params, returns } = builder.definition
  const schemas = [params, returns]

  for (const schema of schemas) {
    // remove empty `defaultProperties`
    // TODO: is this really necessary? why not just disable defaultProps?
    filterObjectDeep(
      schema,
      (key, value) =>
        key === 'defaultProperties' && (!value || arrayEqual(value, []))
    )
  }

  // TODO: remove other extraneous propertis
}

function filterObjectDeep(obj: any, blacklist: (k: string, v: any) => boolean) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      if (blacklist(key, value)) {
        delete obj[key]
      } else if (typeof value === 'object') {
        filterObjectDeep(value, blacklist)
      }
    }
  }
}

if (!module.parent) {
  generateDefinition('./fixtures/double.ts')
    .then((definition) => {
      console.log(JSON.stringify(definition, null, 2))
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
