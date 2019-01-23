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

  test(name, async (t) => {
    const workPath = tempy.directory()
    const nowConfig = await fs.readJson(path.join(fixture, 'now.json'))
    const builds = (nowConfig.builds || []).filter(
      (build) => build.use === 'now-fts'
    )
    const entrypoints = builds.map((build) => build.src)

    const sourceFiles = await globby('**/*.{js,json,ts}', { cwd: fixture })

    const getContext = (entrypoint, config = {}) => ({
      config,
      workPath,
      entrypoint,
      files: sourceFiles.reduce((files, file) => {
        const fsPath = path.join(fixture, file)
        files[file] = new FileFsRef({ fsPath })
        return files
      }, {})
    })

    const context = getContext(entrypoints[0])
    const result = await builder.build(context)
    t.truthy(result)
    t.truthy(result[entrypoints[0]])

    // await fs.remove(workPath)
  })
}
