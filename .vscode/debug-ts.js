'use strict'

const meow = require('meow')
const path = require('path')

const tsFile = getTSFile()
const jsFile = TS2JS(tsFile)

// Guard against running on non-test files
if (!tsFile.endsWith('.test.ts') && !tsFile.endsWith('.spec.ts')) {
  const tsFileBase = path.basename(tsFile)
  console.error()
  console.error(`Error: file "${tsFileBase}" is not a valid test file.`)
  console.error()
  process.exit(1)
}

replaceCLIArg(tsFile, jsFile)

// Ava debugger
require('ava/profile')

/**
 * Get ts file path from CLI args.
 *
 * @return string path
 */
function getTSFile() {
  const cli = meow()
  return cli.input[0]
}

/**
 * Get associated compiled js file path.
 *
 * @param tsFile path
 * @return string path
 */
function TS2JS(tsFile) {
  const tsPathObj = path.parse(tsFile)
  const buildDir = tsPathObj.dir.replace(/\/src\b/, '/build')

  return path.format({
    dir: buildDir,
    ext: '.js',
    name: tsPathObj.name,
    root: tsPathObj.root
  })
}

/**
 * Replace a value in CLI args.
 *
 * @param search value to search
 * @param replace value to replace
 * @return void
 */
function replaceCLIArg(search, replace) {
  process.argv[process.argv.indexOf(search)] = replace
}
