const _ = require('lodash');
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

  describe('POST /posts', () => {
    const data = [{ author: 'Mr. Rogers', content: 'Now POST /posts works' }];

    before(() => {
      posts.create = (attrs) =>
        new Promise((resolve, reject) =>
          resolve(_.merge({ id: 2 }, attrs))
        );
    });

    it('responds with Created and returns content of the newly create post', () =>
      request
        .post('/posts')
        .send({ post: data })
        .expect(_.merge({ id: 2 }, data))
        .expect(201)
    );
  });
});
