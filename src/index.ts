import * as doctrine from 'doctrine'
import * as TS from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'

export default async function createFTSDefinition(file: string) {
  // initialize and compile TS program

  const compilerOptions = {
    ignoreCompilerErrors: true,
    target: TS.ts.ScriptTarget.ES2017
  }

  const project = new TS.Project({ compilerOptions })

  project.addExistingSourceFiles([file])
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

  const sourceFile = project.getSourceFileOrThrow(file)
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
    } else if (functionExports.length > 1) {
      throw new Error('Unable to infer a main function export')
    }
  }

  if (!main) {
    throw new Error('Unable to infer a main function export')
  }

  // console.log(TS.printNode(main.compilerNode))

  // extract main function type and documentation info
  const mainName = main.getName()
  const mainTypeParams = main.getTypeParameters()
  const mainParams = main.getParameters()
  // const mainReturnType = main.getReturnType()

  if (mainTypeParams.length > 0) {
    throw new Error(
      `Type Parameters are not supported for function "${mainName}"`
    )
  }

  const doc = main.getJsDocs()[0]
  const paramComments = {}
  let docs: doctrine.Annotation

  if (doc) {
    const { description } = doc.getStructure()
    docs = doctrine.parse(description as string)
    const paramTags = docs.tags.filter((tag) => tag.title === 'param')

    for (const tag of paramTags) {
      paramComments[tag.name] = tag.description
    }
  }

  const paramsInterface = sourceFile.addInterface({
    name: 'FTSParams'
  })

  for (const param of mainParams) {
    const name = param.getName()

    paramsInterface.addProperty(
      param.getStructure() as TS.PropertySignatureStructure
    )
    // paramsInterface.addProperty({
    //   hasQuestionToken: param.isOptional(),
    //   name,
    //   type: param.getType().getText(param)
    // })

    const comment = paramComments[name]
    if (comment) {
      const property = paramsInterface.getProperty(name)
      property.addJsDoc(comment)
    }
  }

  console.log(TS.printNode(paramsInterface.compilerNode))

  /*
  await sourceFile.save()

  const schema = createJSONSchema(file, compilerOptions)
  console.log(JSON.stringify(schema, null, 2))
  */
}

export function createJSONSchema(
  file: string,
  compilerOptions: object,
  fullTypeName = '*'
): TJS.Definition {
  const program = TJS.getProgramFromFiles(
    [file],
    compilerOptions,
    process.env.CWD
  )
  const schema = TJS.generateSchema(program, fullTypeName)
  return schema
}

createFTSDefinition('./examples/medium.ts')
