import * as http from 'http'
import * as TJS from 'typescript-json-schema'

export interface Function extends TJS.Definition {
  params: TJS.Definition
  return: TJS.Definition
}

export interface Context {
  req: http.IncomingMessage
  res: http.ServerResponse
  ip: string
  user?: string
}
