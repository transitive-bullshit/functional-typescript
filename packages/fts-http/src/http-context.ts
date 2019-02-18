import accepts from 'accepts'
import contentType from 'content-type'
import { Context, version } from 'fts-core'
import http from 'http'
import parseUrl from 'parseurl'
import qs from 'qs'
import typeIs from 'type-is'
import url from 'url'

/**
 * Optional context utilities for FTS functions when invoked over http.
 *
 * Based off of [Koa](https://koajs.com/#context).
 *
 * TODO: port the rest of the jsdocs to this class.
 */
export class HttpContext extends Context {
  public readonly req: http.IncomingMessage
  public readonly res: http.ServerResponse
  public readonly querystring: string
  public readonly query: any
  protected pUrl?: url.URL
  protected pAccept?: accepts.Accepts

  constructor(req: http.IncomingMessage, res: http.ServerResponse) {
    super(version)

    this.req = req
    this.res = res

    const urlinfo = url.parse(req.url)
    this.querystring = urlinfo.query || ''
    this.query = qs.parse(this.querystring)
  }

  /** Request headers */
  get headers() {
    return this.req.headers
  }

  /** Request URL */
  get url() {
    return this.req.url
  }

  /** Request origin URL */
  get origin() {
    return `${this.protocol}://${this.host}`
  }

  /** Full request URL */
  get href() {
    // support: `GET http://example.com/foo`
    if (/^https?:\/\//i.test(this.url)) {
      return this.url
    }
    return this.origin + this.url
  }

  get method() {
    return this.req.method
  }

  get path() {
    return parseUrl(this.req).pathname
  }

  get host() {
    let host: string
    if (this.req.httpVersionMajor >= 2) {
      host = this.get(':authority')
    }
    if (!host) {
      host = this.get('Host')
    }
    if (!host) {
      return ''
    }
    return host.split(/\s*,\s*/, 1)[0]
  }

  get hostname() {
    const host = this.host
    if (!host) {
      return ''
    }
    if ('[' === host[0]) {
      return this.URL.hostname || ''
    } // IPv6
    return host.split(':', 1)[0]
  }

  get URL() {
    if (!this.pUrl) {
      try {
        this.pUrl = new URL(`${this.protocol}://${this.host}${this.url}`)
      } catch (err) {
        this.pUrl = Object.create(null)
      }
    }

    return this.pUrl
  }

  get socket() {
    return this.req.socket
  }

  get charset() {
    try {
      const { parameters } = contentType.parse(this.req)
      return parameters.charset || ''
    } catch (e) {
      return ''
    }
  }

  get contentType() {
    try {
      const { type } = contentType.parse(this.req)
      return type
    } catch (e) {
      return ''
    }
  }

  get length(): number | undefined {
    const len = this.get('Content-Length')
    if (len !== '') {
      return parseInt(len, 10)
    } else {
      return undefined
    }
  }

  get protocol() {
    /* tslint:disable */
    // TODO: this is hacky
    if (this.socket['secure']) {
      return 'https'
    }
    /* tslint:enable */
    return 'http'
  }

  get secure() {
    return 'https' === this.protocol
  }

  get ip() {
    return this.socket.remoteAddress
  }

  get accept() {
    if (!this.pAccept) {
      this.pAccept = accepts(this.req)
    }
    return this.pAccept
  }

  accepts(...args: string[]) {
    return this.accept.types(...args)
  }

  acceptsEncodings(...args: string[]) {
    return this.accept.encodings(...args)
  }

  acceptsCharsets(...args: string[]) {
    return this.accept.charsets(...args)
  }

  acceptsLanguages(...args: string[]) {
    return this.accept.languages(...args)
  }

  is(t: string) {
    return typeIs(this.req, [t])
  }

  get type() {
    const type = this.get('Content-Type')
    if (!type) {
      return ''
    }
    return type.split(';')[0]
  }

  get(field: string): string {
    const req = this.req
    const header = field.toLowerCase()

    switch (header) {
      case 'referer':
      case 'referrer':
        return (
          (req.headers.referrer as string) ||
          (req.headers.referer as string) ||
          ''
        )
      default:
        return (req.headers[header] as string) || ''
    }
  }

  /**
   * Set header `field` to `val`.
   *
   * Examples:
   *
   *    this.set('Foo', ['bar', 'baz'])
   *    this.set('Accept', 'application/json')
   */
  set(field: string, val: string | string[]) {
    if (Array.isArray(val)) {
      val = val.map((v) => (typeof v === 'string' ? v : String(v)))
    } else if (typeof val !== 'string') {
      val = String(val)
    }

    this.res.setHeader(field, val)
  }
}
