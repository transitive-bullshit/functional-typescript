import * as doctrine from 'doctrine'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'

const FTSFunction = 'FTSFunction'
const FTSParams = 'FTSParams'

export default async function createFTSDefinition(file: string) {
  // initialize and compile TS program
  const compilerOptions = {
    ignoreCompilerErrors: true,
    lib: ['es2017', 'dom'],
    target: TS.ts.ScriptTarget.ES2017
  }

  const project = new TS.Project({ compilerOptions })

  project.addExistingSourceFiles([file])
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

  const mainSourceFile = project.getSourceFileOrThrow(file)
  const main = extractMainFunction(mainSourceFile)

  if (!main) {
    throw new Error('Unable to infer a main function export')
  }

  // extract main function type and documentation info
  const mainName = main.getName()
  const mainTypeParams = main.getTypeParameters()

  if (mainTypeParams.length > 0) {
    throw new Error(
      `Generic Type Parameters are not supported for function "${mainName}"`
    )
  }

  const doc = main.getJsDocs()[0]
  let docs: doctrine.Annotation

  if (doc) {
    const { description } = doc.getStructure()
    docs = doctrine.parse(description as string)
  }

  const paramsInterface = addParamsInterface(mainSourceFile, main, docs)
  console.log(TS.printNode(paramsInterface.compilerNode))

  const ftsInterface = addFTSFunctionInterface(mainSourceFile, main, docs)
  console.log(TS.printNode(ftsInterface.compilerNode))

  await mainSourceFile.save()

  const schema = createJSONSchema(file, compilerOptions, FTSFunction)
  console.log(JSON.stringify(schema, null, 2))
}

export function extractMainFunction(
  sourceFile: TS.SourceFile
): TS.FunctionDeclaration | undefined {
  const functionDefaultExports = sourceFile
    .getFunctions()
    .filter((f) => f.isDefaultExport())

  // find main exported function declaration
  let main: TS.FunctionDeclaration

  if (functionDefaultExports.length === 1) {
    main = functionDefaultExports[0]
  } else {
    const functionExports = sourceFile
      .getFunctions()
      .filter((f) => f.isExported())

    if (functionExports.length === 1) {
      main = functionExports[0]
    }
  }

  return main
}

export function addParamsInterface(
  sourceFile: TS.SourceFile,
  main: TS.FunctionDeclaration,
  docs?: doctrine.Annotation
): TS.InterfaceDeclaration {
  const mainParams = main.getParameters()
  const mainName = main.getName()

  const paramsInterface = sourceFile.addInterface({
    name: FTSParams
  })

  const paramComments = {}

  if (docs) {
    const paramTags = docs.tags.filter((tag) => tag.title === 'param')
    for (const tag of paramTags) {
      paramComments[tag.name] = tag.description
    }
  }

  for (let i = 0; i < mainParams.length; ++i) {
    const param = mainParams[i]
    const name = param.getName()

    if (name === 'context') {
      if (i !== mainParams.length - 1) {
        throw new Error(
          `Function parameter "context" must be last parameter to main function "${mainName}"`
        )
      }

      // TODO: ensure context has valid type `FTS.Context`
      // ignore context in parameter aggregation
      break
    } else {
      // TODO: ensure that type is not `FTS.Context`
    }

    const property = paramsInterface.addProperty(
      param.getStructure() as TS.PropertySignatureStructure
    )

    const comment = paramComments[name]
    if (comment) {
      property.addJsDoc(comment)
    }
  }

  return paramsInterface
}

export function addFTSFunctionInterface(
  sourceFile: TS.SourceFile,
  main: TS.FunctionDeclaration,
  docs?: doctrine.Annotation
): TS.InterfaceDeclaration {
  const mainName = main.getName()

  const ftsInterface = sourceFile.addInterface({
    name: FTSFunction
  })

  ftsInterface.addProperty({
    name: 'params',
    type: FTSParams
  })

  addReturnType(ftsInterface, main, docs)

  if (docs && docs.description) {
    ftsInterface.addJsDoc(docs.description)
  }

  ftsInterface.addJsDoc({ description: `@name: ${mainName}` })

  return ftsInterface
}

export function addReturnType(
  ftsInterface: TS.InterfaceDeclaration,
  main: TS.FunctionDeclaration,
  docs?: doctrine.Annotation
): TS.PropertySignature {
  const mainReturnType = main.getReturnType()

  const property = ftsInterface.addProperty({
    name: 'return',
    type: mainReturnType.getText(main.getReturnTypeNode())
  })

  if (docs) {
    const returnTag = docs.tags.find(
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
  compilerOptions: object,
  fullTypeName = '*',
  settings = { required: true }
): TJS.Definition {
  const program = TJS.getProgramFromFiles(
    [file],
    compilerOptions,
    process.env.CWD
  )
  const schema = TJS.generateSchema(program, fullTypeName, settings)
  return schema
}

createFTSDefinition('./examples/medium.ts')
