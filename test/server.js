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

  describe('GET /posts/:id', () => {
    const data = [{ author: 'Mr. Williams', content: 'Now GET /posts/:id works' }];

    before(() => {
      posts.show = (id) =>
        new Promise((resolve, reject) =>
          resolve(_.merge({ id: id }, data))
        );
    });

    it('responds with OK and returns content of the post', () =>
      request
        .get('/posts/3')
        .send(data)
        .expect(_.merge({ id: 3 }, data))
        .expect(200)
    );

    context('when there is no post with the specified id', () => {
      before(() => {
        posts.show = (id) =>
          new Promise((resolve, reject) =>
            reject(id)
          );
      });

      it('responds with NotFound', () =>
        request
          .get('/posts/3')
          .send(data)
          .expect(404)
      );
    });
  });

  describe('POST /posts/:id', () => {
    const data = [{ author: 'Mr. Williams', content: 'Now POST /posts/:id works' }];

    before(() => {
      posts.update = (id, attrs) =>
        new Promise((resolve, reject) =>
          resolve(_.merge({ id: id }, attrs))
        );
    });

    it('responds with Created and returns content of the updated post', () =>
      request
        .post('/posts/4')
        .send({ post: data })
        .expect(_.merge({ id: 4 }, data))
        .expect(200)
    );

    context('when there is no post with the specified id', () => {
      before(() => {
        posts.update = (id) =>
          new Promise((resolve, reject) =>
            reject(id)
          );
      });

      it('responds with NotFound', () =>
        request
          .post('/posts/4')
          .send({ post: data })
          .expect(404)
      );
    });
  });

  describe('DELETE /posts/:id', () => {
    before(() =>
      posts.destroy = (id) =>
        new Promise((resolve, reject) =>
          resolve({ id: id })
        )
    );

    it('responds with the id of the deleted post', () =>
      request
        .delete('/posts/5')
        .expect({ id: 5 })
    );

    context('when there is no post with the specified id', () => {
      before(() =>
        posts.destroy = (id) =>
          new Promise((resolve, reject) =>
            reject(id)
          )
      );

      it('responds with NotFound', () =>
        request
          .delete('/posts/5')
          .expect(404)
      );
    });
  });
});
