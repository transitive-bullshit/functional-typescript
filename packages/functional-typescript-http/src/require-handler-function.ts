import { Definition } from 'functional-typescript'
import path from 'path'
import resolve from 'resolve'
import * as HTTP from './types'

export function requireHandlerFunction(
  definition: Definition,
  file: string
): HTTP.Func {
  let filePath = file
  if (!path.isAbsolute(filePath)) {
    const basedir = path.dirname(module.parent.parent.parent.filename)
    filePath = resolve.sync(file, { basedir })
  }

  let entry: any = require(filePath)

  if (!entry) {
    throw new Error(
      `FTS definition error "${
        definition.title
      }"; empty JS module require in file "${file}."`
    )
  }

  if (definition.config.defaultExport) {
    if (typeof entry === 'object') {
      entry = entry.default
    }
  } else {
    if (!definition.config.namedExport) {
      throw new Error(
        `FTS definition error "${
          definition.title
        }"; must have either a defaultExport or namedExport in file "${file}."`
      )
    }

    entry = entry[definition.config.namedExport]

    if (!entry) {
      throw new Error(
        `FTS definition error "${definition.title}"; JS export "${
          definition.config.namedExport
        }" doesn't exist in file "${file}".`
      )
    }
  }

  if (typeof entry !== 'function') {
    throw new Error(
      `FTS definition error "${
        definition.title
      }"; referenced JS export is not a function in file "${file}".`
    )
  }

  return entry
}
