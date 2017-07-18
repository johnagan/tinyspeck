const { TOKEN, CHANNEL } = process.env, { assert } = require('chai'),
  ts = require('../index');


// describe('RTM', () => {
//   let text = "TESTING";
//   let test = ts.instance({ token: TOKEN, text: text, channel: CHANNEL });

//   describe('rtm.start', () => {
//     it('should create an RTM connection', done => {
//       test.rtm().then(ws => ws.on('open', done));
//     });
//   });

//   describe('events', () => {
//     beforeEach(() => test.removeAllListeners());

//     it('should respond to the hello event', done => {
//       test.on('hello', msg => done());
//     });

//     it('should respond to the presence_change event', done => {
//       test.on('presence_change', msg => done());
//     });

//     it('should respond to the message event', done => {
//       test.on('*', console.log);
//       test.on('message', msg => done());
//       test.send();
//     });

//     it('should respond to any event', done => {
//       test.on('*', msg => done());
//       test.send();
//     });
//   });
// });