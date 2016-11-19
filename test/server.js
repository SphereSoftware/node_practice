const supertest = require('supertest');
const server = require('../app/server');

describe('server', () => {
  const posts = {};
  const request = supertest(server(posts));

  describe('GET /posts', () => {
    before(() => {
      posts.index = () =>
        new Promise((resolve, reject) =>
          resolve({})
        );
    });

    it('responds with OK', () =>
      request
        .get('/posts')
        .expect(200)
    );
  });
});
