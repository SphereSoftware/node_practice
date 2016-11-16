const supertest = require('supertest');
const server = require('../app/server');

describe('server', () => {
  const request = supertest(server);

  describe('GET /posts', () =>
    it('returns OK status', (done) =>
      request
        .post('/posts')
        .expect(200)
    )
  )
})
