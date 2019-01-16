import arrayEqual from 'array-equal'
import * as doctrine from 'doctrine'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'
import * as FTS from './types'
export * from './types'

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

  const originalFileContent = await fs.readFile(file, 'utf8')

  const project = new TS.Project({ compilerOptions })

  project.addExistingSourceFiles([file])
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

  // TODO: throw if errors?

  const sourceFile = project.getSourceFileOrThrow(file)
  const main = extractMainFunction(sourceFile)

  if (!main) {
    throw new Error('Unable to infer a main function export')
  }

  // extract main function type and documentation info
  const title = main.getName ? main.getName() : path.parse(file).name
  const mainTypeParams = main.getTypeParameters()

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
  }

  const builder: FTS.DefinitionBuilder = {
    definition: {
      config: {
        async: false,
        language: 'typescript'
      },
      description: docs && docs.description,
      title
    },
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

export function postProcessDefinition(builder: FTS.DefinitionBuilder) {
  builder.definition.schema.title = builder.title

  // remove empty `defaultProperties`
  // TODO: remove other extraneous propertis
  // TODO: remove / handle Promise type
  filterObjectDeep(
    builder.definition.schema,
    (key, value) =>
      key === 'defaultProperties' && (!value || arrayEqual(value, []))
  )
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

/** Find main exported function declaration */
export function extractMainFunction(
  sourceFile: TS.SourceFile
): TS.FunctionDeclaration | undefined {
  const functionDefaultExports = sourceFile
    .getFunctions()
    .filter((f) => f.isDefaultExport())

  if (functionDefaultExports.length === 1) {
    return functionDefaultExports[0]
  }

  const functionExports = sourceFile
    .getFunctions()
    .filter((f) => f.isExported())

  if (functionExports.length === 1) {
    return functionExports[0]
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
      return externalFunctions[0]
    }
  }

  // TODO: arrow function exports are a lil hacky
  const arrowFunctionExports = sourceFile
    .getDescendantsOfKind(TS.SyntaxKind.ArrowFunction)
    .filter((f) => TS.TypeGuards.isExportAssignment(f.getParent()))

  if (arrowFunctionExports.length === 1) {
    return (arrowFunctionExports[0] as unknown) as TS.FunctionDeclaration
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

      // TODO: ensure context has valid type `FTS.Context`
      // ignore context in parameter aggregation
      break
    } else {
      // TODO: ensure that type is not `FTS.Context`
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
