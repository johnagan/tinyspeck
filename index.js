"use strict"

const url = require('url'),
  http = require('http'),
  axios = require('axios'),
  WebSocket = require('ws'),
  qs = require('querystring'),
  EventEmitter = require('events')

const client = axios.create({
  baseURL: 'https://slack.com/api/',
  headers: { 'user-agent': 'TinySpeck' }
})


class TinySpeck extends EventEmitter {

  /**
   * Contructor
   *
   * @param {object} defaults - The default config for the instance
   */
  constructor(defaults) {
    super()

    // message defaults
    this.defaults = defaults || {}

    // loggers
    this.on('error', console.error)
  }


  /**
   * Create an instance of the TinySpeck adapter
   *
   * @param {object} defaults - The default config for the instance
   * @return {TinySpeck} A new instance of the TinySpeck adapter
   */
  instance(defaults) {
    let options = Object.assign({}, this.defaults, defaults)
    return new this.constructor(options)
  }


  /**
   * Send data to Slack's API
   *
   * @param {string} endPoint - The method name or url (optional - defaults to chat.postMessage)
   * @param {object} args - The JSON payload to send
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
   * Parse a Slack message
   *
   * @param {object|string} message - The incoming Slack message
   * @return {object} The parsed message
   */
  parse(message) {
    if (typeof message === 'string') {
      try { message = JSON.parse(message) } // JSON string
      catch (e) { message = qs.parse(message) } // QueryString
    }

    // interactive message payloads are JSON strings
    if (typeof message.payload === 'string')
      message = JSON.parse(message.payload)

    return message
  }


  /**
   * Notify a Slack message event
   *
   * @param {object|string} message - The incoming Slack message
   * @return {Message} The parsed message
   */
  notify(message) {
    message = this.parse(message)
    let { event_ts, event, command, type, trigger_word, callback_id } = message
    let events = ['*']

    // notify incoming message by type
    if (type) events.push(type)

    // notify event triggered by event type
    if (event) events.push('event', event.type)

    // notify slash command by command
    if (command) events.push('slash_command', command)

    // notify webhook triggered by trigger word
    if (trigger_word) events.push('webhook', trigger_word)

    // notify message button triggered by callback_id
    if (callback_id) events.push('interactive_message', callback_id)

    // emit all events
    events.forEach(name => this.emit(name, message))

    return message
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
   * Start RTM
   *
   * @param {object} options - Optional arguments to pass to the rtm.start method
   * @return {WebSocket} A promise containing the WebSocket
   */
  rtm(options) {
    return this.send('rtm.start', options).then(res => {
      let ws = new WebSocket(res.url)
      ws.on('message', this.notify.bind(this))
      ws.on('close', () => this.ws = null)
      ws.on('open', () => this.ws = ws)
      return Promise.resolve(ws)
    })
  }


  /**
   * OAuth Authorization Url
   *
   * @param {object} params - The OAuth querystring params
   * @return {string} The authorization url
   */
  authorizeUrl(params) {
    return "https://slack.com/oauth/authorize?" + qs.stringify(params)
  }


  /**
   * WebServer to listen for WebHooks
   *
   * @param {int} port - The port number to listen on
   * @param {string} token - Optionally prodide a token to verify
   * @return {listener} The HTTP listener
   */
  listen(port, token) {
    let router = (req, res) => {
      let body = []
      req.on('data', body.push)
      req.on('end', () => {
        // update the request
        let data = Buffer.concat(body).toString()
        req.body = this.parse(data)
        req.url = url.parse(req.url)
        req.params = qs.parse(req.url.query)

        // reject unverified requests
        if (token && token !== req.body.token) {
          res.statusCode = 401
          return res.end()
        }

        // new subscription challenge
        if (req.body.challenge) return res.end(req.body.challenge)

        // notify route handler if available
        if (this.eventNames().indexOf(req.url.pathname) !== -1) {
          res.json = data => res.end(JSON.stringify(data)) // json helper
          this.emit(req.url.pathname, req, res)
        } else {
          // notify listeners of the event
          this.notify(req.body)
          res.end()
        }
      })
    }

    return http.createServer(router).listen(port, () => {
      console.log(`listening for events on http://localhost:${port}`)
    })
  }

}

module.exports = new TinySpeck()