const {TOKEN, PORT} = process.env,
      {assert} = require('chai'),
      ts = require('../index');

describe('webserver', () => {
  it('should start a server', () => {
    let server = ts.listen(PORT);
    assert.isNotNull(server);
  });
});