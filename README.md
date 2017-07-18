# TinySpeck

A lightweight adapter for node.js to interact with Slack's Web and RTM APIs.

## Usage
* [Installation](#install)
* [Sending Data](#sending-data)
  * [Posting Messages](#posting-messages)
  * [Updated Messages](#updating-messages)
  * [Respond to WebHooks](#respond-to-webhooks)
  * [Calling Other API Methods](#calling-other-api-methods)
* [Instances](#creating-an-instance)
* [Events](#events)
* [RTM](#rtm)
* [WebServer](#webserver)
* [WebSockets Proxy](#websocket-proxy)

## Install
```
npm i tinyspeck --save
```

## Sending Data
The TinySpeck client is a minimal wrapper around Slack's Web API Web. The default action is sending messages.

### Posting Messages
The `send` method defaults to calling [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage).
```js
const slack = require('tinyspeck')

let message = {
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890',
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
}

// send message defaults to calling chat.postMessage
slack.send(message).then(data => {
  // Success!
})
```

### Updating Messages
If your messages includes an `ts` property, it will call [`chat.update`](https://api.slack.com/methods/chat.update) instead.

```js
let message = {
  ts: "123422342134.234",
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890',
  text: "Updated Message!!"
}

instance.send(message)
```

### Respond to WebHooks
To respond to response urls, pass the url in place of a method name.
```js
// respond to webhooks
slack.send('https://hooks.slack.com/services/T0000/B000/XXXX', message)
```

### Calling Other API Methods
Access any of Slack's [API Methods](https://api.slack.com/methods) by passing in the method name.
```js
let message = {
  token: 'xoxb-12345678900-ABCD1234567890'
}

// pass in the method name to call
slack.send('auth.test', message).then(data => {
  // Success!
})
```

## Creating an Instance
Use to create a new instance of TinySpeck with a custom defaults

```js
// create an instance with defaults
let instance = slack.instance({
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890'  
})

let message = {
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
}

// send message to any Slack endpoint
instance.send('chat.postMessage', message)
```

## Events
Event handlers that are triggered when messages are received from Slack.

```js
// usage
slack.on('event name', [... 'event name',] callback)

// handle the "/test" slash commands
slack.on('/test', message => { })

// handle all slash commands
slack.on('slash_command', message => { })

// handle the outgoing webhooks trigger word "googlebot"
slack.on('googlebot', message => { })

// handle multiple events
slack.on('googlebot', '/test', 'slash_commands', message => { })

// wildcard support
slack.on('*', message => { })
```



## RTM
Creates a connection to Slack's RTM API.
```js
// options to pass to rtm.start
slack.rtm({ options }) // returns a promise

// basic
slack.rtm({ token: 'xoxb-12345678900-ABCD1234567890' }).then(ws => {    
  // connected are the websock is returned
})

// with defaults
let instance = slack.instance({
  token: 'xoxb-12345678900-ABCD1234567890'  
})

instance.rtm()
```

## WebServer
A simple http server to receive JSON posts from Slack's WebHooks or Events.

```js
// usage
slack.listen(port, 'validation token (optional)')

// example
slack.listen(3000, 'gIkuvaNzQIHg97ATvDxqgjtO')
```

## WebSocket Proxy
TinySpeck can act as a WebSocket proxy, forwarding requests from Slack's HTTP POSTS to an open WebSocket connection and back. Because this will be an open connection, it will require a querystring verification to connect to.

### Using Verification Token To Authenticate
Passing in `true` to the third parameter of `listen` will enable WebSockets using the Slack's Verification Token for authentication.

#### Server
```js
slack.listen(3000, 'gIkuvaNzQIHg97ATvDxqgjtO', true)
```

#### Client
```js
const WebSocket = require('ws')
const ws = new WebSocket('ws://yourserver.com?token=qtGI5L0SXbtiQfPY53UhkSIs');
```

### Customizing Token and Parameters
If you would like more control over the token and parameter, you can call `proxy` after calling `listen` and provide custom values.

#### Server
```js
let server = slack.listen(3000, 'gIkuvaNzQIHg97ATvDxqgjtO')
let proxy = slack.proxy(server, "CUSTOM_TOKEN", "custom_param")
```

#### Client
```js
const WebSocket = require('ws')
const ws = new WebSocket('ws://yourserver.com?custom_param=CUSTOM_TOKEN');
```

### Sending Messages Over WebSockets
Sending messages over the websocket will call the [`send method`](#calling-api-methods) and pass through your message to `chat.postMessage`.

#### Client
```js
const WebSocket = require('ws')
const ws = new WebSocket('ws://yourserver.com?token=qtGI5L0SXbtiQfPY53UhkSIs');

let message = {
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890',
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
}

ws.send( JSON.stringify(message) )
```

### Calling Other Methods
If you wanted to call another Slack API method, you can include the `method` property to your message object and it will all that method instead.

#### Client
```js
let message = {
  method: 'auth.test',
  token: 'xoxb-12345678900-ABCD1234567890'
}

ws.send( JSON.stringify(message) )
```
