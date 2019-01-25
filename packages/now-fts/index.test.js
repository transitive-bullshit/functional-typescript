const FileFsRef = require('@now/build-utils/file-fs-ref.js')
const test = require('ava')
const fs = require('fs-extra')
const globby = require('globby')
const path = require('path')
const tempy = require('tempy')
const builder = require('.')

const fixturesPath = path.resolve(__dirname, 'fixtures')
const fixtures = fs
  .readdirSync(fixturesPath)
  .map((fixture) => path.join(fixturesPath, fixture))

for (const fixture of fixtures) {
  const { name } = path.parse(fixture)

  test.serial(name, async (t) => {
    const nowConfig = await fs.readJson(path.join(fixture, 'now.json'))
    const builds = (nowConfig.builds || []).filter(
      (build) => build.use === 'now-fts'
    )
    const entrypoints = builds
      .map((build) => build.src)
      .map((pattern) => globby.sync(pattern, { cwd: fixture }))
      .reduce((acc, files) => acc.concat(files), [])
    const sourceFiles = await globby('**/*.{js,json,ts}', { cwd: fixture })

    const getContext = (entrypoint, workPath, config = {}) => ({
      config,
      workPath,
      entrypoint,
      files: sourceFiles.reduce((files, file) => {
        const fsPath = path.join(fixture, file)
        files[file] = new FileFsRef({ fsPath })
        return files
      }, {})
    })

    for (const entrypoint of entrypoints) {
      const workPath = tempy.directory()
      console.log({ fixture, entrypoint, workPath })

      const context = getContext(entrypoint, workPath)
      const result = await builder.build(context)
      t.truthy(result)
      t.truthy(result[entrypoint])

      // await fs.remove(workPath)
    }
  })
}
