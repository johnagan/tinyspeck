# TinySpeck

A lightweight adapter for node.js to interact with Slack's Web and RTM APIs.

## Usage
* [Installation](#install)
* [API Requests](#calling-api-methods)
* [Instances](#creating-an-instance)
* [Writing Messages](#writing-messages)
* [Events](#events)
* [RTM](#rtm)
* [WebServer](#webserver)
* [Digester](#digester)

## Install
```
npm i tinyspeck --save
```

## Calling API Methods
Access any of Slack's [API Methods](https://api.slack.com/methods) by passing in the method name.
```javascript
let slack = require('tinyspeck');

let message = {
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890',
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
}

// send message to any Slack endpoint
slack.send('chat.postMessage', message).then(data => {
  // Success!
});

// respond to webhooks
slack.send('https://hooks.slack.com/services/T0000/B000/XXXX', message);
```


## Creating an Instance
Use to create a new instance of TinySpeck with a custom defaults

```javascript
// create an instance with defaults
let instance = slack.instance({
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890'  
});

let message = {
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
};

// send message to any Slack endpoint
instance.send('chat.postMessage', message);
```

## Writing Messages
The Send method defaults to `chat.postMessage`. If your messages includes an `ts` property, it will call `chat.update` instead.

```javascript
let instance = slack.instance({
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890'  
});

// complex messages are allowed
instance.send({
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
});

// including the ts will update the message
let orginalMsg = {
  ts: "1234",
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
};

instance.send(orginalMsg, { 
  text: 'My new text!'
});
```

## Events
Event handlers that are triggered when messages are recived from Slack.

```javascript
// usage
slack.on('event name', [... 'event name',] callback)

// handle the "/test" slash commands
slack.on('/test', message => { });

// handle all slash commands
slack.on('slash_commands', message => { });

// handle the outgoing webhooks trigger word "googlebot"
slack.on('googlebot', message => { });

// handle multiple events
slack.on('googlebot', '/test', 'slash_commands', message => { });

// wildcard support
slack.on('*', message => { });
```

## RTM
Creates a connection to Slack's RTM API.
```javascript
// options to pass to rtm.start
slack.rtm({options}) // returns a promise

// basic
slack.rtm({ token: 'xoxb-12345678900-ABCD1234567890' }).then(ws => {    
  // connected are the websock is returned
});

// with defaults
let instance = slack.instance({
  token: 'xoxb-12345678900-ABCD1234567890'  
});

instance.rtm();
```

## WebServer
A simple http server to recieve JSON posts from Slack's WebHooks or Events.

```javascript
// usage
slack.listen(port, 'validation token (optional)');

// example
slack.listen(3000, 'gIkuvaNzQIHg97ATvDxqgjtO');
```

## Digester
The digester reads a Slack message as a QueryString, JSON string, or JSON object and then fires events based on the messages contents. This is handled automatically by the WebServer and RTM.

```javascript
slack.digest('JSON string' or {message}) // triggers the events

// AWS Lambda Example
exports.handler = (event, context, callback) => {
  slack.digest(event.body); // parses the body  
}
```
