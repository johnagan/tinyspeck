# TinySpeck

A lightweight adapter for node.js to interact with Slack's Web and RTM APIs.

## Guide
* [Installation](#install)
* [API Requests](#calling-api-methods)
* [Defaults](#defaults)
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
slack.send('chat.postMessage', message).then(response => {
  // Success!
});

// respond to webhooks
slack.send('https://hooks.slack.com/services/T0000/B000/XXXX', message);
```

## Defaults
```javascript
slack.defaults = {
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890'  
};

let message = {
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
};

// send message to any Slack endpoint
slack.send('chat.postMessage', message);
```

## Creating an Instance
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
```javascript
let instance = slack.instance({
  unfurl_links: true,
  channel: 'C1QD223DS1',
  token: 'xoxb-12345678900-ABCD1234567890'  
});

// helper for {text: 'hello'} and posts to the best option of Web or RTM
instance.write("hello!");

// complex messages are allowed
instance.write({
  text: "I am a test message http://slack.com",
  attachments: [{
    text: "And here's an attachment!"
  }]
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
Creates a connections to Slack's RTM API.
```javascript
// options to pass to rtm.start
slack.rtm({options}) // returns a promise

// basic
slack.rtm({ token: 'xoxb-12345678900-ABCD1234567890' }).then(ws => {    
  // connected are the websock is returned
});

// with defaults
slack.defaults = {
  token: 'xoxb-12345678900-ABCD1234567890'  
}
slack.rtm()
```

## WebServer
A simple http server to recieve JSON posts from Slack's WebHooks or Events.

```javascript
// usage
slack.listen(port, 'path - defaults to root');

// example
slack.listen(3000, '/slack/incoming');
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
