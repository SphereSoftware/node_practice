const supertest = require('supertest');
const server = require('../app/server');

describe('server', () => {
  const posts = {};
  const request = supertest(server(posts));

  describe('GET /posts', () => {
    const data = [{id: 1, author: 'Mr. Smith', content: 'Now GET /posts works'}];

    before(() => {
      posts.index = () =>
        new Promise((resolve, reject) =>
          resolve(data)
        );
    });

    it('responds with OK', () =>
      request
        .get('/posts')
        .expect(data)
        .expect(200)
    );
  });
});
