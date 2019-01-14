import * as doctrine from 'doctrine'
import { FunctionDeclaration, printNode, Project, ts } from 'ts-simple-ast'
import * as TJS from 'typescript-json-schema'

export default async function createFTSDefinition(file: string) {
  const compilerOptions = {
    ignoreCompilerErrors: true,
    target: ts.ScriptTarget.ES2017
  }

  const project = new Project({ compilerOptions })

  project.addExistingSourceFiles([file])
  project.resolveSourceFileDependencies()

  const diagnostics = project.getPreEmitDiagnostics()
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

  const sourceFile = project.getSourceFileOrThrow(file)
  const functionDefaultExports = sourceFile
    .getFunctions()
    .filter((f) => f.isDefaultExport())

  let main: FunctionDeclaration

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

  // console.log(printNode(main.compilerNode))

  // const name = main.getName()
  const signature = main.getSignature()
  // const typeParams = signature.getTypeParameters()
  const params = signature.getParameters()
  // const returnType = signature.getReturnType()
  // const docs = signature.getDocumentationComments()
  // const tags = signature.getJsDocTags()

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

  for (let i = 0; i < params.length; ++i) {
    const param = params[i]
    const node = param.getValueDeclaration()
    const name = param.getName()

    paramsInterface.insertProperty(i, {
      name,
      type: param.getTypeAtLocation(node).getText(node)
    })

    const comment = paramComments[name]
    if (comment) {
      const property = paramsInterface.getProperty(name)
      property.addJsDoc(comment)
    }
  }

  await sourceFile.save()

  console.log(printNode(paramsInterface.compilerNode))

  const schema = createJSONSchema(file, compilerOptions)
  console.log(JSON.stringify(schema, null, 2))
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

createFTSDefinition('./examples/double.ts')
