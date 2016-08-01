"use strict";

const http = require('http'),
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
    this.cache = {};

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
    return new this.constructor(defaults);
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
    if (message.ts) endPoint = 'chat.update';

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
    if (message.payload) message.payload = JSON.parse(message.payload);
    
    return message;
  }


  /**
   * Digest a Slack message and process events
   *
   * @param {object|string} message - The incoming Slack message
   * @return {Message} The parsed message
   */
  digest(message) {
    let {event_ts, event, command, type, trigger_word, payload} = this.parse(message);
    
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
    if (payload) this.emit(payload.callback_id, message);

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
    return this.send('rtm.start', options).then(data => {
      this.cache = data.self;
      let ws = new WebSocket(data.url);
      ws.on('message', this.digest.bind(this));
      ws.on('close', () => this.ws = null);
      ws.on('open', () => this.ws = ws);
      return Promise.resolve(ws);
    });
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

        // notify upon request
        this.emit(req.url, message); 

        // new subscription challenge
        if (message.challenge) return res.end(message.challenge);
        
        // digest the incoming message
        if (!token || token === message.token) this.digest(message);
        
        // close response
        res.end();
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
   * @return {Promise} A promise with the api result
   */
  post(endPoint, payload) {
    if (!/^http/i.test(endPoint)) {
      
      // serialize JSON params
      if (payload.attachments)
        payload.attachments = JSON.stringify(payload.attachments);

      // serialize JSON for POST
      payload = qs.stringify(payload);
    }

    return axios({ 
      url: endPoint,
      data: payload ,
      method: 'post',
      baseURL: 'https://slack.com/api/',
      headers: { 'user-agent': 'TinySpeck' }
    });
  }
}

module.exports = new TinySpeck();