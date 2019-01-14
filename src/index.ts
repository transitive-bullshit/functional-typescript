// import * as fs from 'fs-extra'
// import * as tempy from 'tempy'
// import * as typedoc from 'typedoc'
// import * as ts from 'typescript'
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

  const name = main.getName()
  const signature = main.getSignature()
  const typeParams = signature.getTypeParameters()
  const params = signature.getParameters()
  const returnType = signature.getReturnType()
  const docs = signature.getDocumentationComments()
  const tags = signature.getJsDocTags()

  const schema = createJSONSchema(file, compilerOptions)

  console.log(printNode(main.compilerNode))

  // TODO: create interface from params and generate JSON schema from that

  /*
  const app = new typedoc.Application(opts)
  const src = app.expandInputFiles(files)
  const project = app.convert(src)
  const docFile = tempy.file({ extension: 'json' })
  app.generateJson(project, docFile)

  const docs = await fs.readJson(docFile)
  console.log(JSON.stringify(docs, null, 2))
  */
}

export function createJSONSchema(
  file: string,
  compilerOptions: object
): TJS.Definition {
  const program = TJS.getProgramFromFiles(
    [file],
    compilerOptions,
    process.env.CWD
  )
  const schema = TJS.generateSchema(program, '*')
  return schema
}

createFTSDefinition('./examples/double.ts')
