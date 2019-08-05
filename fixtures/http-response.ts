import * as FTS from 'fts-core'

// 1x1 png from http://www.1x1px.me/
const image =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX/TQBcNTh/AAAAAXRSTlPM0jRW/QAAAApJREFUeJxjYgAAAAYAAzY3fKgAAAAASUVORK5CYII='

export default (): FTS.HttpResponse => {
  return {
    headers: { 'Content-Type': 'image/png' },
    statusCode: 200,
    body: Buffer.from(image, 'base64')
  }
}
