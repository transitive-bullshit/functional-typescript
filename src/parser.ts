import arrayEqual from 'array-equal'
import * as doctrine from 'doctrine'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'
import * as FTS from './types'

const FTSFunction = 'FTSFunction'
const FTSParams = 'FTSParams'

export async function generateDefinition(
  file: string
): Promise<FTS.Definition> {
  // initialize and compile TS program
  const compilerOptions = {
    ignoreCompilerErrors: true,
    // TODO: why do we need to specify the full filename for these lib definition files?
    lib: ['lib.es2018.d.ts', 'lib.dom.d.ts'],
    target: TS.ScriptTarget.ES5
  }

  const definition: Partial<FTS.Definition> = {
    config: {
      async: false,
      context: false,
      defaultExport: true,
      language: 'typescript'
    }
  }

  const originalFileContent = await fs.readFile(file, 'utf8')

  const project = new TS.Project({ compilerOptions })

  project.addExistingSourceFiles([file])
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  if (diagnostics.length > 0) {
    console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))
    // TODO: throw?
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

  addFunctionInterface(builder)
  await sourceFile.save()

  try {
    builder.definition.schema = createJSONSchema(file, FTSFunction, {
      defaultProps: true,
      noExtraProps: true,
      required: true
    })
    postProcessDefinition(builder)
  } finally {
    await fs.writeFile(file, originalFileContent, 'utf8')
  }

  return builder.definition as FTS.Definition
}

/** Find main exported function declaration */
export function extractMainFunction(
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
    definition.config.namedExport = func.getExportKeywordOrThrow().getText()
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
      definition.config.namedExport = func.getExportKeywordOrThrow().getText()
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

export function addFunctionInterface(
  builder: FTS.DefinitionBuilder
): TS.InterfaceDeclaration {
  addParamsDeclaration(builder)

  const functionInterface = builder.sourceFile.addInterface({
    name: FTSFunction
  })

  functionInterface.addProperty({
    name: 'params',
    type: FTSParams
  })

  addReturnType(builder, functionInterface)
  return functionInterface
}

export function addParamsDeclaration(
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

      builder.definition.config.context = true
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
  }

  return paramsDeclaration
}

export function addReturnType(
  builder: FTS.DefinitionBuilder,
  functionInterface: TS.InterfaceDeclaration
): TS.PropertySignature {
  const mainReturnType = builder.main.getReturnType()
  let type = mainReturnType.getText()
  builder.definition.config.async = builder.main.isAsync()

  const promiseRe = /^Promise<(.*)>$/
  const promiseReMatch = type.match(promiseRe)

  if (promiseReMatch) {
    type = promiseReMatch[1]
    builder.definition.config.async = true
  }

  const property = functionInterface.addProperty({
    name: 'return',
    type
  })

  if (builder.docs) {
    const returnTag = builder.docs.tags.find(
      (tag) => tag.title === 'returns' || tag.title === 'return'
    )

    if (returnTag) {
      property.addJsDoc(returnTag)
    }
  }

  return property
}

export function createJSONSchema(
  file: string,
  fullTypeName = '*',
  settings?: TJS.PartialArgs,
  jsonCompilerOptions: any = {}
): TJS.Definition {
  const compilerOptions = {
    lib: ['es2018', 'dom'],
    target: 'es5',
    ...jsonCompilerOptions
  }

  const program = TJS.getProgramFromFiles(
    [file],
    compilerOptions,
    process.cwd()
  )

  return TJS.generateSchema(program, fullTypeName, settings)
}

export function postProcessDefinition(builder: FTS.DefinitionBuilder) {
  const { schema } = builder.definition

  schema.title = builder.title
  delete schema.required
  delete schema.additionalProperties

  // remove empty `defaultProperties`
  filterObjectDeep(
    schema,
    (key, value) =>
      key === 'defaultProperties' && (!value || arrayEqual(value, []))
  )

  // TODO: remove other extraneous propertis
}

export function filterObjectDeep(
  obj: any,
  blacklist: (k: string, v: any) => boolean
) {
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
  generateDefinition('./fixtures/hello-world.ts')
    .then((definition) => {
      console.log(JSON.stringify(definition, null, 2))
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
