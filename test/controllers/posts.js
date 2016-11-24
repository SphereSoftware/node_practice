const should = require('should');
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
  });
});
