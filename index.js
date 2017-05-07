"use strict"

const url = require('url'),
  http = require('http'),
  axios = require('axios'),
  WebSocket = require('ws'),
  qs = require('querystring'),
  EventEmitter = require('events'),
  Payload = require('slack-payload')

const client = axios.create({
  baseURL: 'https://slack.com/api/',
  headers: { 'user-agent': 'TinySpeck' }
})


class TinySpeck extends EventEmitter {

  /**
   * Contructor
   *
   * @param {Object} defaults - The default config for the instance
   */
  constructor(defaults) {
    super()

    // websocket server
    this.socket = null

    // http server
    this.server = null

    // message defaults
    this.defaults = defaults || {}

    // loggers
    this.on('error', console.error)
  }


  /**
   * Create an instance of the TinySpeck adapter
   *
   * @param {Object} defaults - The default config for the instance
   * @return {TinySpeck} A new instance of the TinySpeck adapter
   */
  instance(defaults) {
    let options = Object.assign({}, this.defaults, defaults)
    return new this.constructor(options)
  }


  /**
   * Send data to Slack's API
   *
   * @param {String} endPoint - The method name or url (optional - defaults to chat.postMessage)
   * @param {Object} args - The JSON payload to send
   * @return {Promise} A promise with the API result
   */
  send(...args) {
    // use defaults when available
    let message = Object.assign({}, this.defaults, ...args)

    // default action is post message
    let endPoint = 'chat.postMessage'

    // if an endpoint was passed in, use it
    if (typeof args[0] === 'string') endPoint = args.shift()

    // call update if ts included and no endpoint
    else if (message.ts) endPoint = 'chat.update'

    // convert content-type if webapi endpoint
    if (!endPoint.match(/^http/i)) {
      // serialize JSON params
      if (message.attachments)
        message.attachments = JSON.stringify(message.attachments)

      // serialize JSON for POST
      message = qs.stringify(message)
    }

    return client.post(endPoint, message).then(r => r.data)
  }


  /**
   * Parse HTTP body
   *
   * @param {Object|String} message - The incoming Slack message
   * @return {Object} The parsed message
   */
  parse(message) {
    if (typeof message === 'string') {
      try { message = JSON.parse(message) } // JSON String
      catch (e) { message = qs.parse(message) } // QueryString
    }

    // interactive message payloads are JSON Strings
    if (typeof message.payload === 'string')
      message = JSON.parse(message.payload)

    return message
  }


  /**
   * Notify a Slack message event
   *
   * @param {Object|String} message - The incoming Slack message
   * @return {Payload} The Slack Payload
   */
  notify(message) {
    let payload = new Payload(message)
    let events = ['*'].concat(payload.types)
    events.forEach(name => this.emit(name, payload))
    return payload
  }


  /**
   * Event handler for incoming messages
   *
   * @param {mixed} names - Any number of event names to listen to. The last will be the callback
   * @return {TinySpeck} The TinySpeck adapter
   */
  on(...names) {
    let callback = names.pop() // support multiple events per callback
    names.forEach(name => super.on(name, callback))
    return this // chaining support
  }


  /**
   * Emit an event to listeners
   * 
   * @param {String} name - The event name emitted
   * @param {any} message - The event message to emit
   */
  emit(name, message) {
    super.emit(name, message)

    // broadcast to open websockets
    if (this.socket) {
      let data = JSON.stringify({ name, message })
      this.socket.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(data)
      })
    }
  }


  /**
   * Start RTM
   *
   * @param {Object} options - Optional arguments to pass to the rtm.start method
   * @return {WebSocket} A promise containing the WebSocket
   */
  rtm(options) {
    return this.send('rtm.start', options).then(res => {
      let ws = new WebSocket(res.url)
      ws.on('message', this.notify.bind(this))
      ws.on('close', () => this.ws = null)
      ws.on('open', () => this.ws = ws)
      return ws
    })
  }


  /**
   * OAuth Authorization Url
   *
   * @param {Object} params - The OAuth queryString params
   * @return {String} The authorization url
   */
  authorizeUrl(params) {
    return "https://slack.com/oauth/authorize?" + qs.stringify(params)
  }


  /**
   * WebServer to listen for WebHooks
   *
   * @param {Number} port - The port number to listen on
   * @param {String} token - (Optional) the Slack verification token
   * @param {Boolean} enableWebSockets - Optionally enable the WebSockets proxy
   * @return {http.Server} The HTTP server
   */
  listen(port, token, enableWebSockets) {
    // http server
    let router = this.router.bind(this, token)
    this.server = http.createServer(router).listen(port, () => {
      console.log(`listening for events on http://localhost:${port}`)
      if (enableWebSockets) this.proxy(server, token)
    })

    return this.server
  }


  /**
   * Turn on the WebSocket proxy
   * 
   * @param {http.Server} server - The http server to attach to
   * @param {String} token - The token to verify websocket connections with
   * @param {String} paramName - (Optional) The param name to read the token from
   * @return {WebSocket} The websocket connection
   */
  proxy(server, token, paramName) {
    paramName = paramName || 'token'
    this.socket = new WebSocket.Server({ server })

    // validate websocket connections
    this.socket.on('connection', socket => {
      let location = url.parse(socket.upgradeReq.url, true)
      let callback = data => socket.send(JSON.stringify(data))

      // redirect incoming messages to Slack
      let onMessage = message => {
        let data = JSON.parse(message)
        if (data.method) this.send(data.method, data).then(callback)
        else this.send(data).then(callback)
      }

      if (location.query[paramName] !== token) socket.close() // validate against token
      else socket.on('message', onMessage)
    })

    return this.socket
  }


  /**
   * HTTP Request Router
   * 
   * @param {String} token - The Slack verification token
   * @param {Object} req - The HTTP request Object
   * @param {Object} res - The HTTP response Object
   */
  router(token, req, res) {
    let body = []
    req.on('data', body.push.bind(body))
    req.on('end', () => {
      // update the request
      let data = Buffer.concat(body).toString()
      req.body = this.parse(data)
      req.url = url.parse(req.url)
      req.query = qs.parse(req.url.query)

      // new subscription challenge
      if (req.body.challenge) return res.end(req.body.challenge)

      // notify route handler if available
      if (this.eventNames().indexOf(req.url.pathname) !== -1) {
        // redirect helper
        res.redirect = Location => {
          res.writeHead(302, { Location })
          res.end()
        }

        // json helper
        res.json = data => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }

        super.emit(req.url.pathname, req, res)
      } else {
        // reject unverified requests
        if (token && token !== req.body.token) {
          res.statusCode = 401
          return res.end()
        }

        // notify listeners of the event
        this.notify(req.body)
        res.end()
      }
    })
  }

}

module.exports = new TinySpeck()