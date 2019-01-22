const FileBlob = require('@now/build-utils/file-blob')
const { build, prepareCache, config } = require('@now/node')
const { runNpmInstall } = require('@now/build-utils/fs/run-user-scripts.js')

exports.build = async (context, ...args) => {
  const { files, entrypoint, workPath } = context
  const ftsPath = path.join(workPath, 'fts')

  console.log('writing fts package.json...')
  await download({
    'package.json': new FileBlob({
      data: JSON.stringify({
        dependencies: {
          'fts': '1.0.0',
          'fts-http': '1.0.0'
        }
      })
    })
  }, ftsPath)

  console.log('installing dependencies for fts...')
  await runNpmInstall(ftsPath, npmArguments)


  const stream = context.files[entrypoint].toStream()
  const { data } = await FileBlob.fromStream({ stream })

  const content = `${data.toString()}
    let __original_lambda
    if (typeof exports === 'function') {
      __original_lambda = exports
    }
    else if (typeof module.exports === 'function') {
      __original_lambda = module.exports
    }
    else {
      throw new Error(
        \`now-micro builder expects main export to be a function (\${typeof module.exports} found)\`,
      )
    }
    exports = module.exports = (req, res) => require('micro').run(req, res, __original_lambda)
  `

  const result = new FileBlob({ data: content })

  // override entrypoint file
  context.files[entrypoint] = result

  // delegate to @now/node the rest of the building process
  return build(context, ...args)
}

exports.config = config
exports.prepareCache = prepareCache
