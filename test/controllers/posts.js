const _ = require('lodash');
const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const PostsController = require('../../app/controllers/posts');

describe('PostsController', () => {
  const client = {};
  const posts = new PostsController(client, 'index', 'type');

  describe('index', () => {
    before(() =>
      client.search = () =>
        new Promise((resolve, reject) =>
          resolve({
            "took": 27,
            "timed_out": false,
            "_shards": {
              "total": 5,
              "successful": 5,
              "failed": 0
            },
            "hits": {
              "total": 1,
              "max_score": 1,
              "hits": [
                {
                  "_index": 'index',
                  "_type": 'type',
                  "_id": "AVhMJLOujQMgnw8euuFI",
                  "_score": 1,
                  "_source": {
                    "text": "Now PostController index works!",
                    "author": "Mr.Smith"
                  }
                }
              ]
            }
          })
        )
    );

    it('parses and returns post data', () =>
      posts.index().then((result) =>
        result.should.deepEqual([{
          id: "AVhMJLOujQMgnw8euuFI",
          author: "Mr.Smith",
          text: "Now PostController index works!"
        }])
      )
    );

    it('specifies proper index and type while searching', () => {
      const spy = sinon.spy(client, 'search');

      return posts.index().then(() => {
        spy.should.be.calledOnce();
        spy.should.be.calledWith({
          index: 'index',
          type: 'type'
        });
      });
    });
  });

  describe('create', () => {
    const attrs = { author: 'Mr. Rogers', text: "Now PostController create works!" };

    before(() => {
      client.index = () =>
        new Promise((resolve, reject) =>
          resolve({
            "_index": 'index',
            "_type": "type",
            "_id": "AViXYdnZxmF-_Ui11JAF",
            "_version": 1,
            "created": true
          })
        );
    });

    it('parses and returns post data', () =>
      posts.create(attrs).then((result) =>
        result.should.deepEqual(_.merge({ id: "AViXYdnZxmF-_Ui11JAF" }, attrs))
      )
    );

    it('specifies proper index, type and body', () => {
      const spy = sinon.spy(client, 'index');

      return posts.create(attrs).then(() => {
        spy.should.be.calledOnce();
        spy.should.be.calledWith({
          index: 'index',
          type: 'type',
          body: attrs
        });
      });
    });
  });

  describe('show', () => {
    const id = "AVhMJLOujQMgnw8euuFI";
    const attrs = [{ author: 'Mr. Williams', content: 'Now PostsController show works!' }];

    before(() =>
      client.get = () =>
        new Promise((resolve, reject) =>
          resolve({
            "_index": 'index',
            "_type": 'post',
            "_id": id,
            "_version": 1,
            "found": true,
            "_source": attrs
          })
        )
    );

    it('parses int returns post data', () =>
      posts.show(id).then((result) =>
        result.should.deepEqual(_.merge({ id: id }, attrs))
      )
    );

    it('specifies proper index, type and id', () => {
      const spy = sinon.spy(client, 'get');

      return posts.show(1).then(() => {
        spy.should.be.calledOnce();
        spy.should.be.calledWith({
          index: 'index',
          type: 'type',
          id: 1
        });
      });
    });

    context('when there is no post with the specified id', () => {
      before(() =>
        client.get = () => {
          return new Promise((resolve, reject) =>
            resolve({
              "_index": 'index',
              "_type": 'post',
              "_id": id,
              "found": false
            })
          );
        }
      );

      it('returns rejected promise with the non existing post id', () =>
        posts.show(id).catch((result) =>
          result.should.equal(id)
        )
      );
    });
  });
});
