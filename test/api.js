const {TOKEN, PORT} = process.env,
      {assert} = require('chai'),
      ts = require('../index');


describe('Web API', () => {
  beforeEach(() => {
    ts.defaults = {};
    ts.removeAllListeners();
  });
  
  describe('api.test', () => {
    it('should connect', done => {
      ts.send('api.test').then(data => {
        assert.isTrue(data.ok, data);
        done();
      });
    });

    it('should connect arguments', done => {
      let text = '123';
      ts.send('api.test', { test: text }).then(data => {
        assert.isTrue(data.ok, data);
        assert.isNotNull(data.args, data);
        assert.equal(data.args.test, text);
        done();
      });
    });

    it('should connect with defaults', done => {
      let text = '456';
      let instance = ts.instance({ test: text });
      instance.send('api.test').then(data => {
        assert.isTrue(data.ok, data);
        assert.isNotNull(data.args, data);
        assert.equal(data.args.test, text);
        done();
      });
    });

    it('should connect with an instance', done => {
      let text = '789';
      let instance = ts.instance({ test: text });
      instance.send('api.test').then(data => {
        assert.isTrue(data.ok, data);
        assert.isNotNull(data.args, data);
        assert.equal(data.args.test, text);
        done();
      });
    });
  });


  describe('auth.test', () => {
    it('should connect with a valid token', done => {
      ts.send('auth.test', { token: TOKEN }).then(data => {
        assert.isTrue(data.ok, data);
        done();
      });
    });

    it('should fail to connect with an invalid token', done => {
      ts.send('auth.test', { token: '' }).then(data => {
        assert.isNotTrue(data.ok, data);
        done();
      });
    });
  });
});