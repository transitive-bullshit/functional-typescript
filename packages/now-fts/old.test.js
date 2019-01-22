jest.mock('@now/node', () => ({
  config: {},
  prepareCache: () => {},
  build: ({ files, entrypoint }) => ({ [entrypoint]: files[entrypoint] })
}))

const tempy = require('tempy')
const path = require('path')
const nodeBuilder = require('@now/node')
const FileBlob = require('@now/build-utils/file-blob')
const FileFsRef = require('@now/build-utils/file-fs-ref')
const microBuilder = require('now-micro')
const { lambda } = require('now-we-test')
const console = require('console-suppress').default

const { build } = microBuilder

describe('now-micro', () => {
  let tempDir

  const rootPath = path.resolve(__dirname, './fixtures/sample-project')

  const entrypoints = [
    path.join(rootPath, '/index.js'),
    path.join(rootPath, '/invalid.js'),
    path.join(rootPath, '/error.js'),
    path.join(rootPath, '/returning.js'),
    path.join(rootPath, '/async.js')
  ]

  const getContext = (entrypoint, config = {}) => ({
    config,
    workPath: tempDir.name,
    entrypoint,
    files: entrypoints.reduce(
      (carry, entrypoint) => ({
        ...carry,
        [entrypoint]: new FileFsRef({ fsPath: entrypoint })
      }),
      {}
    )
  })

  beforeEach(() => {
    tempDir = tempy.directory()

    console.cleanSuppressors()
  })

  afterEach(() => {
    tempDir.removeCallback()
  })

  describe('build', () => {
    it('should re-export @now/node builder implementation', () => {
      expect(microBuilder.config).toBe(nodeBuilder.config)
      expect(microBuilder.prepareCache).toBe(nodeBuilder.prepareCache)
    })

    it('should compile code correctly', async () => {
      const context = getContext(entrypoints[0])

      const original = (await FileBlob.fromStream({
        stream: context.files[entrypoints[0]].toStream()
      })).data.toString()

      const {
        [entrypoints[0]]: { data }
      } = await build(context)

      expect(data.indexOf(original)).toBe(0)

      expect(data).toContain(
        'exports = module.exports = (req, res) => require(\'micro\').run(req, res, __original_lambda)'
      )
    })
  })

  describe('execution', () => {
    const compile = async entrypoint => {
      const content = (await build(getContext(entrypoint)))[entrypoint].data

      const exports = {}
      // eslint-disable-next-line no-unused-vars
      const module = { exports }

      // eslint-disable-next-line no-eval
      eval(content)

      return exports
    }

    it('should throw when unable to figure out lambda', async () => {
      await expect(compile(entrypoints[1])).rejects.toThrow(
        'now-micro builder expects main export to be a function (object found)'
      )
    })

    it('should compile to a micro executing lambda', async () => {
      const runner = await compile(entrypoints[0])

      expect(runner.toString()).toBe(
        '(req, res) => require(\'micro\').run(req, res, __original_lambda)'
      )
    })

    it('should execute an http valid lambda', async () => {
      const runner = lambda(await compile(entrypoints[0]))
      const result = await runner.get('/')

      expect(result).toHaveProperty('status', 200)
      expect(result).toHaveProperty('text', 'SIMPLE HTTP LAMBDA')
    })

    it('should execute an error throwing lambda', async () => {
      console.error.suppress(/ERROR THROWING LAMBDA/)

      const runner = lambda(await compile(entrypoints[2]))
      const result = await runner.get('/')

      expect(result).toHaveProperty('status', 400)
      expect(result).toHaveProperty('text', 'ERROR THROWING LAMBDA')
    })

    it('should execute a value returning lambda', async () => {
      const runner = lambda(await compile(entrypoints[3]))
      const result = await runner.get('/')

      expect(result).toHaveProperty('status', 200)
      expect(result).toHaveProperty('text', 'VALUE RETURNING LAMBDA')
    })

    it('should execute an async lambda', async () => {
      const runner = lambda(await compile(entrypoints[4]))
      const result = await runner.get('/')

      expect(result).toHaveProperty('status', 200)
      expect(result).toHaveProperty('text', 'ASYNC LAMBDA')
    })
  })
})
