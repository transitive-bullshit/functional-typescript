import { HttpResponse } from 'fts-core'
import { HttpContext } from 'fts-http'

export default (body: Buffer, context: HttpContext): HttpResponse => {
  return {
    headers: { 'Content-Type': context.contentType },
    statusCode: 200,
    body
  }
}
