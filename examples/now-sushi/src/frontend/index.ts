import { createServer, IncomingMessage, ServerResponse } from 'http'
import * as fetch from 'node-fetch'

import { Sushi } from '../../types'
import layout from './layout'

const handler = async (_: IncomingMessage, res: ServerResponse) => {
  const sushiResponse = await fetch.default(
    'https://fts-typescript-sushi.now.sh/api/all'
  )
  const sushiList: Array<Sushi['type']> = await sushiResponse.json()

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(
    layout(`<h1>TypeScript Sushi API</h1>
  <div class="sushi-machine">
      <div class="neta"></div>
      <div class="rice"></div>
      <div class="sushi"></div>
      <div class="table"></div>
  </div>
  <h2>Learn more about...</h2>
  <ul>
      ${sushiList
        .map(
          (name) =>
            `<li><a class="button" href="/sushi/${name}">${name}</a></li>`
        )
        .join('\n')}
  </ul><br>
  <br>
  <small>Sushi animation by <a target="_blank" href="https://codepen.io/yumeeeei/">yumeeeei</a>.</small>`)
  )
}

if (!process.env.IS_NOW) {
  createServer(handler).listen(3000)
}

export default handler
