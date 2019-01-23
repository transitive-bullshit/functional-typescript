const { createLambda } = require('@now/build-utils/lambda.js')
const download = require('@now/build-utils/fs/download.js')
const FileBlob = require('@now/build-utils/file-blob.js')
const FileFsRef = require('@now/build-utils/file-fs-ref.js')
const execa = require('execa')
const fs = require('fs-extra')
const glob = require('@now/build-utils/fs/glob.js')
const path = require('path')
const {
  runNpmInstall,
  runPackageJsonScript
} = require('@now/build-utils/fs/run-user-scripts.js')

const tsconfig = 'tsconfig.json'

/** @typedef { import('@now/build-utils/file-ref') } FileRef */
/** @typedef {{[filePath: string]: FileRef}} Files */

/**
 * @typedef {Object} BuildParamsType
 * @property {Files} files - Files object
 * @property {string} entrypoint - Entrypoint specified for the builder
 * @property {string} workPath - Working directory for this build
 */

/**
 * @param {BuildParamsType} buildParams
 * @param {Object} [options]
 * @param {string[]} [options.npmArguments]
 */
async function downloadInstallAndBundle(
  { files, entrypoint, workPath },
  { npmArguments = [] } = {}
) {
  const userPath = path.join(workPath, 'user')
  const nccPath = path.join(workPath, 'ncc')
  const ftsPath = path.join(workPath, 'fts')

  console.log('downloading user files...')
  const downloadedFiles = await download(files, userPath)

  console.log("installing dependencies for user's code...")
  const entrypointFsDirname = path.join(userPath, path.dirname(entrypoint))
  await runNpmInstall(entrypointFsDirname, npmArguments)

  console.log('writing ncc package.json...')
  fs.outputJsonSync(path.join(nccPath, 'package.json'), {
    dependencies: {
      '@zeit/ncc': '0.9.0'
    }
  })

  console.log('installing dependencies for ncc...')
  await runNpmInstall(nccPath, npmArguments)

  console.log('writing fts package.json...')
  fs.outputJsonSync(path.join(ftsPath, 'package.json'), {
    dependencies: {
      fts: '1.0.0',
      'fts-http': '1.0.0'
    }
  })

  const ftsTsConfigPath = path.join(ftsPath, tsconfig)
  if (downloadedFiles[tsconfig]) {
    console.log(`copying ${tsconfig}`)
    fs.copySync(downloadedFiles[tsconfig].fsPath, ftsTsConfigPath)
  } else {
    console.log(`using default ${tsconfig}`)
    fs.outputJsonSync(ftsTsConfigPath, {
      compilerOptions: {
        target: 'es2015',
        moduleResolution: 'node'
      }
    })
  }

  // TODO: temp
  console.log('linking dependencies for fts...')
  execa.shellSync('yarn link fts fts-http', { cwd: ftsPath, stdio: 'inherit' })

  // TODO: temp
  // console.log('installing dependencies for fts...')
  // await runNpmInstall(ftsPath, npmArguments)

  return [downloadedFiles, nccPath, ftsPath, entrypointFsDirname]
}

async function generateDefinitionAndCompile({
  nccPath,
  ftsPath,
  downloadedFiles,
  entrypoint
}) {
  const input = downloadedFiles[entrypoint].fsPath
  const preparedFiles = {}

  console.log('generating entrypoint fts definition...')
  const fts = require(path.join(ftsPath, 'node_modules/fts'))
  const definition = await fts.generateDefinition(input)
  const definitionData = JSON.stringify(definition, null, 2)
  console.log('fts definition', definitionData)

  // TODO: this should be accessible via a special route
  // const definitionFsPath = path.join(ftsPath, 'definition.json')
  // preparedFiles[definitionFsPath] = new FileBlob({ data: definitionData })

  const handlerPath = path.join(ftsPath, 'handler.ts')
  const handler = `
import * as ftsHttp from 'fts-http'
import handler from '${input.replace('.ts', '')}'
const definition = ${definitionData}
export default ftsHttp.createHttpHandler(definition, handler)
`

  fs.writeFileSync(handlerPath, handler, 'utf8')

  console.log('compiling entrypoint with ncc...')
  const ncc = require(path.join(nccPath, 'node_modules/@zeit/ncc'))
  const { code, assets } = await ncc(handlerPath)
  const outputHandlerPath = path.join('user', 'fts-handler.js')

  const blob = new FileBlob({ data: code })
  // move all user code to 'user' subdirectory
  preparedFiles[outputHandlerPath] = blob
  // eslint-disable-next-line no-restricted-syntax
  for (const assetName of Object.keys(assets)) {
    const { source: data, permissions: mode } = assets[assetName]
    const blob2 = new FileBlob({ data, mode })
    preparedFiles[
      path.join('user', path.dirname(entrypoint), assetName)
    ] = blob2
  }

  return {
    preparedFiles,
    handlerPath: outputHandlerPath
  }
}

exports.config = {
  maxLambdaSize: '5mb'
}

/**
 * @param {BuildParamsType} buildParams
 * @returns {Promise<Files>}
 */
exports.build = async ({ files, entrypoint, workPath }) => {
  const [
    downloadedFiles,
    nccPath,
    ftsPath,
    entrypointFsDirname
  ] = await downloadInstallAndBundle(
    { files, entrypoint, workPath },
    { npmArguments: ['--prefer-offline'] }
  )

  console.log('running user script...')
  await runPackageJsonScript(entrypointFsDirname, 'now-build')

  const { preparedFiles, handlerPath } = await generateDefinitionAndCompile({
    nccPath,
    ftsPath,
    downloadedFiles,
    entrypoint
  })

  // setting up launcher
  const launcherPath = path.join(__dirname, 'launcher.js')
  let launcherData = await fs.readFile(launcherPath, 'utf8')

  launcherData = launcherData.replace(
    '// PLACEHOLDER',
    [
      'process.chdir("./user");',
      `listener = require("${handlerPath}");`,
      'if (listener.default) listener = listener.default;'
    ].join(' ')
  )

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
    'bridge.js': new FileFsRef({ fsPath: require('@now/node-bridge') })
  }

  const lambda = await createLambda({
    files: { ...preparedFiles, ...launcherFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10'
  })

  return { [entrypoint]: lambda }
}

exports.prepareCache = async ({ files, entrypoint, workPath, cachePath }) => {
  await fs.remove(workPath)
  await downloadInstallAndBundle({ files, entrypoint, workPath: cachePath })

  return {
    ...(await glob('user/node_modules/**', cachePath)),
    ...(await glob('user/package-lock.json', cachePath)),
    ...(await glob('user/yarn.lock', cachePath)),
    ...(await glob('ncc/node_modules/**', cachePath)),
    ...(await glob('ncc/package-lock.json', cachePath)),
    ...(await glob('ncc/yarn.lock', cachePath)),
    ...(await glob('fts/node_modules/**', cachePath)),
    ...(await glob('fts/package-lock.json', cachePath)),
    ...(await glob('fts/yarn.lock', cachePath))
  }
}
