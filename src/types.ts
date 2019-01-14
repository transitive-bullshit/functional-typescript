export interface FunctionDefinition {
  title: string
  description: string
  // params
  // returns
}

export interface HttpHeaders {
  [header: string]: string
}

export interface Context {
  ip: string
  headers: HttpHeaders
  user?: string
}
