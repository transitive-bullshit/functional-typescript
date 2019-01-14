export interface FunctionDefinition {
  title: string
  description: string
  // params: Array<Param>
  // returns: Type
}

export interface HttpHeaders {
  [header: string]: string
}

export interface Context {
  ip: string
  headers: HttpHeaders
  user?: string
}
