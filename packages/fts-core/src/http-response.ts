interface OutgoingHttpHeaders {
  [header: string]: string
}

/**
 * Fallback to allow raw HTTP responses that are not type-checked.
 */
export interface HttpResponse {
  statusCode: number
  headers: OutgoingHttpHeaders
  body: Buffer
}
