const {TOKEN, PORT} = process.env,
      {assert} = require('chai'),
      ts = require('../index');

describe('Webserver', () => {
  it('should start a server', () => {
    let server = ts.listen(PORT);
    assert.isNotNull(server);
  });
});