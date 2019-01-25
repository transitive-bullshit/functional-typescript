import { createServer, IncomingMessage, ServerResponse } from 'http'
import * as fetch from 'node-fetch'
import url from 'url'

import { Sushi } from '../../../types'
import layout from '../layout'

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  const { type } = url.parse(req.url || '', true).query
  res.writeHead(200, { 'Content-Type': 'text/html' })

  try {
    const sushiResponse = await fetch.default(
      'https://fts-typescript-sushi.now.sh/api/get-sushi?type=' + type
    )
    const { description, pictureURL, title }: Sushi = await sushiResponse.json()

    res.end(
      layout(`<h1>${title}</h1>
  <div class="sushi-detail">
    <div>
        <div class="image-container"><img alt="${title}" src="${pictureURL}" /></div>
    </div>
    <div>
        <p>${description}</p>
    </div>
  </div>
  
  <a href="/" class="button" role="button">Back</a>`)
    )
  } catch (e) {
    res.end(
      layout(`<h1>Invalid Sushi Type</h1>
  <div class="sushi-detail">
    <div>
        <div class="image-container"><h2 style="color: black">?</h2></div>
    </div>
    <div>
        <p>We don't know what you mean by \`${type}\`. <a href="/">Go back to the start page</a> to see available choices.</p>
    </div>
  </div>`)
    )
  }
}

if (!process.env.IS_NOW) {
  createServer(handler).listen(3000)
}

export default handler
