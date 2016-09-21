"use strict";

const url = require('url'),
      http = require('http'),
      axios = require('axios'),
      WebSocket = require('ws'),
      qs = require('querystring'),
      EventEmitter = require('events');
      

class TinySpeck extends EventEmitter {
  /**
   * Contructor
   *
   * @param {Object} defaults - The default config for the instance
   */
  constructor(defaults) {
    super();

    // message defaults
    this.defaults = defaults || {};
    
    // loggers
    this.on('error', console.error);
  }


  /**
   * Create an instance of the TinySpeck adapter
   *
   * @param {Object} defaults - The default config for the instance
   * @return {TinySpeck} A new instance of the TinySpeck adapter
   */
  instance(defaults) {
    let options = Object.assign({}, this.defaults, defaults);
    return new this.constructor(options);
  }


  /**
   * Send data to Slack's API
   *
   * @param {string} endPoint - The method name or url (optional - defaults to chat.postMessage)
   * @param {object} args - The JSON payload to send
   * @return {Promise} A promise with the API result
   */
  send(...args) {
    let endPoint = 'chat.postMessage'; // default action is post message

    // if an endpoint was passed in, use it
    if (typeof args[0] === 'string') endPoint = args.shift();

    // use defaults when available
    let message = Object.assign({}, this.defaults, ...args);  

    // call update if ts included
    if (message.ts && endPoint === 'chat.postMessage') endPoint = 'chat.update';

    return this.post(endPoint, message);
  }


  /**
   * Parse a Slack message
   *
   * @param {object|string} message - The incoming Slack message
   * @return {Message} The parsed message
   */
  parse(message) {
    if (typeof message === 'string') {
      try { message = JSON.parse(message); }      // JSON string
      catch(e) { message = qs.parse(message); }   // QueryString
    }
    
    // message button payloads are JSON strings
    if (typeof message.payload === 'string') 
      message.payload = JSON.parse(message.payload);
    
    return message;
  }


  /**
   * Digest a Slack message and process events
   *
   * @param {object|string} message - The incoming Slack message
   * @return {Message} The parsed message
   */
  digest(message) {
    message = this.parse(message);
    let {event_ts, event, command, type, trigger_word, payload} = message;
    
    // wildcard
    this.emit('*', message);

    // notify incoming message by type
    if (type) this.emit(type, message);

    // notify slash command by command
    if (command) this.emit(command, message);

    // notify event triggered by event type
    if (event) this.emit(event.type, message);

    // notify webhook triggered by trigger word
    if (trigger_word) this.emit(trigger_word, message);

    // notify message button triggered by callback_id
    if (payload) this.emit(payload.callback_id, payload);

    return message;
  }


  /**
   * Event handler for incoming messages
   *
   * @param {mixed} names - Any number of event names to listen to. The last will be the callback
   * @return {TinySpeck} The TinySpeck adapter
   */
  on(...names) {
    let callback = names.pop(); // support multiple events per callback
    names.forEach(name => super.on(name, callback));

    return this; // chaining support
  }


  /**
   * Start RTM
   *
   * @param {object} options - Optional arguments to pass to the rtm.start method
   * @return {WebSocket} A promise containing the WebSocket
   */
  rtm(options) {
    return this.send('rtm.start', options).then(res => {
      let ws = new WebSocket(res.url);
      ws.on('message', this.digest.bind(this));
      ws.on('close', () => this.ws = null);
      ws.on('open', () => this.ws = ws);
      return Promise.resolve(ws);
    });
  }


 /**
   * OAuth Authorization Url
   *
   * @param {object} params - The OAuth querystring params
   * @return {string} The authorization url
   */
  authorizeUrl(params) {
    return "https://slack.com/oauth/authorize?" + qs.stringify(params);
  }


 /**
   * OAuth Token
   *
   * @param {object} params - The authorization params
   * @return {promise} A Promise containing the authorization results
   */
  token(params) {
    return this.post('https://slack.com/api/oauth.access', params, true)
  }


 /**
   * WebServer to listen for WebHooks
   *
   * @param {int} port - The port number to listen on
   * @param {string} token - Optionally prodide a token to verify
   * @return {listener} The HTTP listener
   */
  listen(port, token) {    
    return http.createServer((req, res) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        let message = this.parse(data);
        
        // update the request
        req.body = message;
        req.url = url.parse(req.url);
        req.params = qs.parse(req.url.query);

        // new subscription challenge
        if (message.challenge) return res.end(message.challenge);
        
        // digest the incoming message
        if (!token || token === message.token) this.digest(message);

        // notify route handler if available, otherwise end
        if (this.eventNames().indexOf(req.url.pathname) !== -1) {          
          this.emit(req.url.pathname, req, res);   
        } else {
          res.end();
        }
      });
    }).listen(port, 'localhost', () => {
      console.log(`listening for events on http://localhost:${port}`);
    });
  }


  /**
   * POST data to Slack's API
   *
   * @param {string} endPoint - The method name or url
   * @param {object} payload - The JSON payload to send
   * @param {boolean} stringify - Flag to stringify the JSON body
   * @return {Promise} A promise with the api result
   */
  post(endPoint, payload, stringify) {
    if (!/^http/i.test(endPoint) || stringify === true) {
      
      // serialize JSON params
      if (payload.attachments)
        payload.attachments = JSON.stringify(payload.attachments);

      // serialize JSON for POST
      payload = qs.stringify(payload);
    }

    let req = axios({ 
      url: endPoint,
      data: payload ,
      method: 'post',
      baseURL: 'https://slack.com/api/',
      headers: { 'user-agent': 'TinySpeck' }
    });

    return new Promise((resolve, reject) => {
      req.then(r => resolve(r.data)).catch(reject);
    });
  }
}

module.exports = new TinySpeck();