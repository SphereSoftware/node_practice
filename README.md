Create application directory:

`mkdir npm_api`
`cd npm_api`

Initialize git repository:

`git init`

Initialize npm application:

`npm init`

Accept all proposed default values here. `package.json` is created.

I'm going to use [Mocha](https://mochajs.org/) framework for testing. So let's install it:

`npm install --save-dev mocha`

Now lets create empty test folder:

`mkdir test`

And configure test script in `package.json`:

```
"scripts": {
  "test": "node_modules/.bin/mocha"
}
```

Let's test result:

`npm test`

You should see something like `No test files found` in output.

Let's install [supertest](https://github.com/visionmedia/supertest) library for requests testing:

`npm install --save-dev supertest`

And now we are ready to create our first test:

`test/server.js`:

```
describe('server', () => {
  const request = supertest(server);

  describe('GET /posts', () =>
    it('responds with OK', () =>
      request
        .get('/posts')
        .expect(200)
    )
  );
});
```

Run the test and see expected error message:

```Error: Cannot find module '../app/server'```

Ok. So we don't have `server` defined yet. Let's do it. Let's define server.

I will use [restify](http://restify.com/) package for building web api.

`npm install --save-dev restify`

And here our basic trivial server just to make test green:

```
const restify = require('restify');
const server = restify.createServer();

server.get('/posts', (req, res, next) =>
  res.send({})
);

module.exports = server;
```

If everything is done properly then `npm test` would output:

```
server
  GET /posts
    ✓ responds with OK


1 passing (32ms)
```

So now we have server that responds to `GET /posts` properly.

Let's make some manual integration testing to be sure that server properly responds to real
requests. For that first we need to create script that runs server and binds it to some port.

`./start.js`:

```
const server = require('./app/server');

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

and then update `package.json` to defined it as application start script:

```
...
"script": {
  "test": "node_modules/.bin/mocha",
  "start": "node start.js"
}
...
```

and run server itself - `npm start`.

As result we should see that server is running and ready to accept requests:

```
> node_api@1.0.0 start /projects/node_api
> node start.js

restify listening at http://[::]:8080
```

Let's make test request:

```
curl -XGET http://localhost:8080/posts
{}%
```

So now we have an API server start is ready to respond to our requests.

Let's introduce now controller class:

`app/controllers/posts.js`:

```
module.exports = class {
  index() {
    return new Promise((resolve, reject) =>
      resolve({})
    );
  }
};
```

That is simplest possible controller version. And modify our server to use that controller:

```
const restify = require('restify');
const server = restify.createServer();
const PostsController = require('./controllers/posts.js');

const posts = new PostsController();

server.get('/posts', (req, res, next) =>
  posts.index().then((result) =>
    res.send(200, result)
  )
);

module.exports = server;
```
Now we need some possiblity to test content that is returned from a PostsController.
To do that we need to be able to define what content is returned by posts controller and test
that it's serialized and returned from the server.

To do that we can define our own test version of the posts controller and pass it to the server
so it will be used ther.

Let's modify our server first:

```
const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  server.get('/posts', (req, res, next) =>
    posts.index().then((result) =>
      res.send(200, result)
    )
  );

  return server;
};
```
So now controlled is expected to be passed from outside rather that created inside.

Now let's pass stub object to the server in the test:


`test/server.js`:

```
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
```

Run tests. Everything is green. Great!

Also we need to modify our start script:

`./start.js`:

```
const serverFactory = require('./app/server');
const PostsController = require('./app/controllers/posts');

const posts = new PostsController();
const server = serverFactory(posts);

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

Now let's run server and verify that nothing is broken:

run server:

```
npm start
```

And 'curling' then:

```
curl -XGET http://localhost:8080/posts
{}%
```

Everything looks fine. We are ready to start content testing!

First we need to update test so it became red:

`test/server.js`:

```
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
});
```

Run `npm test` and see an error:

```
Error: expected [ { id: 1, author: 'Mr. Smith', content: 'Now GET /posts works' } ] response body, got {}
```

So looks like server does not return posts data. Let's update server then:

```
const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  server.get('/posts', (req, res, next) =>
    posts.index().then((result) =>
      res.send(200, result)
    )
  );

  return server;
};
```

And run `npm test` again. It's green again! Nice.

Now let's add one more action - `POST /posts` that will create new post.

Starting with test as usual:

`test/server.js`:

```
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
```

run `npm test` and see the error:

```
Error: expected { '0': { author: 'Mr. Rogers', content: 'Now POST /posts works' },
  id: 2 } response body, got { code: 'MethodNotAllowedError',
  message: 'POST is not allowed' }
```

Ok. that was expected. Let's define that action then:

`app/server.js`:

```
server.post('/posts', (req, res, next) =>
  posts.create(req.params.post).then((result) =>
    res.send(201, result)
  )
);
```

Not run `npm test` again. Hm... Error again:

```
Error: expected { '0': { author: 'Mr. Rogers', content: 'Now POST /posts works' },
  id: 2 } response body, got { id: 2 }
```

It looks like params that we sent were not parsed properly. Let's plug in body parser:

`app/server.js`:

```
const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  server.use(restify.bodyParser());

  server.get('/posts', (req, res, next) =>
    posts.index().then((result) =>
      res.send(200, result)
    )
  );

  server.post('/posts', (req, res, next) =>
    posts.create(req.params.post).then((result) =>
      res.send(201, result)
    )
  );

  return server;
};
```

And run `npm test` again. Not everything should be just fine.

Now it's time to add one new action: 'GET /posts/:id'. This action is tricky. There always possible
such situation whe post with the specified identifier does not exist. So there are two cases that
must be tested - with existing post and non existing post

Let's start from the first case - when post with the specified identifier exist. Tests first:

```
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
});
```

Run `npm test` and get an error:

```
Error: expected { '0': { author: 'Mr. Williams', content: 'Now GET /posts/:id works' },
  id: 3 } response body, got { code: 'ResourceNotFound', message: '/posts/3 does not exist' }
```

So resource is not found. We need to define action on the server:

```
server.get('/posts/:id', (req, res, next) =>
  posts.show(req.params.id).then((result) =>
    res.send(200, result)
  )
);
```

Run test and now everything should be green!

But what about the case where there is no post with the specified id? Server obviously should
return NotFound (404) status in this case.

Let's add test first:

```
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
```

Run `npm test` and get an error:

```
Error: timeout of 2000ms exceeded. Ensure the done() callback is being called in this test.
```

That happened because promise int controller stub is rejected and that is not handled by the server.
Let's do it:

```
server.get('/posts/:id', (req, res, next) =>
  posts.show(req.params.id).then((result) =>
    res.send(200, result)
  ).catch(() => res.send(404))
);
```

Run tests again. And now all of them should be green :)

Ok. So let's start working on one more REST action - update.

Test first:

```
describe('POST /posts/:id', () => {
  var data = [{ author: 'Mr. Williams', content: 'Now POST /posts/:id works' }];

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
});
```

run it and see an expected error:

```
 Error: expected { '0': { author: 'Mr. Williams', content: 'Now POST /posts/:id works' },
  id: 4 } response body, got { code: 'MethodNotAllowedError',
  message: 'POST is not allowed' }
```

Ok. So let's define missing method:

`app/server.js`:

```
server.post('/posts/:id', (req, res, next) =>
  posts.update(req.params.id, req.params.post).then((result) =>
    res.send(200, result)
  )
);
```

So now we have server update action that is capable to handle existing resource. But what about
non existing resource?

Let's handle it. Test first as usual:

```
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
        .post('/posts/3')
        .send({ post: data })
        .expect(404)
    );
  });
});
```

Run tests and get an error:

```
Error: timeout of 2000ms exceeded. Ensure the done() callback is being called in this test.
```

Yeah. Than is reasonable. Let's add error handling to the server action:

```
server.post('/posts/:id', (req, res, next) =>
  posts.update(req.params.id, req.params.post).then((result) =>
    res.send(200, result)
  ).catch(() => res.send(404))
);
```

Run tests again. End we are green again!

So - there is only one action left non implemented - `destroy`. Let's fill that blank.

Update test first as usual:

```
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
});
```

Run it. Get error. Define action on server:

```
server.del('/posts/:id', (req, res, next) =>
  posts.destroy(req.params.id).then((result) =>
    res.send(200, { id: req.params.id })
  )
);
```

Run tests again. Green!

And now handle the case that there is no post with the specified id:

Test first:

`test/server.js`:

```
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
```

Run test. Get timeout error.  Update server:

`app/server.js`:

```
server.del('/posts/:id', (req, res, next) =>
  posts.destroy(req.params.id).then((result) =>
    res.send(200, { id: req.params.id })
  ).catch(() => res.send(404))
);
```

Everything is green now.

We have workable server. Now we can start working on controller.

So - PostsController. It will work with ES client. We can assume that ES client is well tested
so we do not have to test it. Methods of the controller - those only is intended to be tested.
Similiarly to server - let's pass client outside so we can inject test client there.

First - let's update `PostsController` definition:

```
module.exports = class {
  constructor(client) {
    this.client = client;
  }

  index() {
    return new Promise((resolve, reject) =>
      resolve({})
    );
  }
};
```

So now client might be defined outside, including test env.

Install `should`:

```
npm install should --save-dev
```

Now let's create test stub:

```
var PostsController = require('../../app/controllers/posts');

describe('PostsController', function() {
  var client = {};
  var posts = new PostsController(client);
});
```

Run tests. Everything still should be green. So we have everything prepared for `PostsController`
development.

Let's write our first test - index action.

Test first:

```
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
```

We see that possible ES response is imitated there. Run tests and see the failure: our current
`PostsController` always returns empty object.

Let's change it:

```
const _ = require('lodash');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  index() {
    return this.client
      .search()
      .then((res) =>
        _.map(res.hits.hits, (hit) =>
          _.merge(hit._source, { id: hit._id })
        )
      );
  }
};
```

Run test again. Green again!

We tested that `PostsController` parsed ES result properly. But we also need to test that it
passes correct params to the client.

There are two params that needs to be specified as parameters of the method `search` of the
ES client: `index` and `type`. First let's add those params to `PostsController` constructor:

```
constructor(client, indexName, type) {
  this.client = client;
  this.indexName = indexName;
  this.type = type;
}
```

and now let's specifiy some test params in the `PostsController` specs:

```
describe('PostsController', () => {
  const client = {};
  const posts = new PostsController(client, 'index', 'type');
  ...
}
```

run test again. Green. Nothing is broken. Great.

Now let's verify that we specified those params propely when called `client.search` method.

I'm gonna use [sinon](http://sinonjs.org/) for that:

```
npm install sinon --save-dev
```

And `should` asserts for `sinon`:

```
npm install shold-sinon --save-dev
```

Require that in controller test:

`test/controllers/posts.js`:

```
var sinon = require('sinon');
require('should-sinon');
```

and add parameters verification test:

`test/controllers/posts.js`:

```
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
```

Run `npm test`. See failure:

```
expected 'search' to be called with arguments { index: "index", type: "type" }
    search() => [Promise] {  } at PostsController.index (/projects/node_api/app/controllers/posts.js:14:22)
    expected false to be true
```

Ok. Update controller now:

`app/controllers/posts.js`:

```
index() {
  return this.client.search({
    index: this.indexName,
    type: this.type
  })
  .then((res) =>
    _.map(res.hits.hits, (hit) =>
      _.merge(hit._source, { id: hit._id })
    )
  );
}
```

Now everything should be ok. Tests should b green if everything is done properly.

Let's perform first full manual integration test to be sure that all parts of our puzzle fits
properly.

It's assumed here that you have ES service installed locally and running on default 9200 port.

* Create index ( 'node_api' ):

```
curl -XPOST localhost:9200/node_api
> {"acknowledged":true}%
```

* Create `post` example:

```
curl -XPOST localhost:9200/node_api/posts -d '{ "author": "Mr. Smith", "content": "Now GET /posts works!" }'
> {"_index":"node_api","_type":"posts","_id":"AViW9F1lhQ3AxSLOwi2k","_version":1,"created":true}%
```

* Install [elasticsearch](https://www.npmjs.com/package/elasticsearch)

```
npm install elasticsearch --save-dev
```

* Create ES client instance:

`./app/client.js`:

```
const elasticsearch = require('elasticsearch');

module.exports = new elasticsearch.Client({
  host: 'localhost:9200'
});
```

* Specify index and type names in server instance that is created in the `start.js` script:

`./start.js`:

```
const client = require('./app/client');
const serverFactory = require('./app/server');
const PostsController = require('./app/controllers/posts');

const posts = new PostsController(client, 'node_api', 'posts');
const server = serverFactory(posts);

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

* Run our server:

`npm start`

* Make test request:

```
curl -XGET http://localhost:8080/posts                                                                                                                                                               1
> [{"author":"Mr. Smith","content":"Now GET /posts works!","id":"AViW9F1lhQ3AxSLOwi2k"}]%
```

Works!

Now let's implement indexing posta in ES.

Test first:

```
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
```

There are two tests are defined above. In real life those tests should be done in two iteractions.
We joined both them into one iteraction here for simplicity.

Run tests. See errors. Add indexing support to controller:

```
create(attrs) {
  return this.client.index({
    index: this.indexName,
    type: this.type,
    body: attrs
  })
  .then((res) =>
    _.merge({ id: res._id }, attrs)
  );
}
```

Now everything should back to green :)

Next action: `show`. You remember that it always possible that non existing resource requested.
We need to handle it. But for now let's assume that such situation is impossible and implement
simplified version of the method `show`.

Test:

`test/controllers/posts.js`:

```
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
});
```

Test are red now. Method `show` is even not defined on the `PostsController`. Let's defined it:

`app/controllers/posts.js`:

```
show(id) {
  return this.client.get({
    index: this.indexName,
    type: this.type,
    id: id
  })
  .then((res) =>
    _.merge({ id: res._id }, res._source)
  );
}
```

Now tests are green :)

Now let's take care of the non existing resource.

First that case should be imitated in test:

`test/controllers/posts.js`:

```
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
```

Run tests. Get error. Update controller.

`app/controllers/posts.js`:

```
show(id) {
  return this.client.get({
    index: this.indexName,
    type: this.type,
    id: id
  })
  .then((res) =>
    new Promise((resolve, reject) => {
      if (res.found) {
        return resolve(_.merge({ id: res._id }, res._source));
      }

      reject(id);
    })
  );
}
```

And now it's handled!

Ok. Next action is update. As usual we are going to start wiht happy path.

Tests:

```
describe('update', () => {
  const id = "AVhMJLOujQMgnw8euuFI";
  const attrs = [{ author: 'Mr. Williams', content: 'Now PostsController show works!' }];

  before(() =>
    client.update = () =>
      new Promise((resolve, reject) =>
        resolve({
          "_index": "index",
          "_type": "type",
          "_id": id,
          "_version": 4
        })
      )
  );

  it('parses and returns post data', () =>
    posts.update(id, attrs).then((result) =>
      result.should.deepEqual(_.merge({ id: id }, attrs))
    )
  );

  it('specifies proper index, type, id and attrs', () => {
    const spy = sinon.spy(client, 'update');

    return posts.update(id, attrs).then(() => {
      spy.should.be.calledOnce();
      spy.should.be.calledWith({
        index: 'index',
        type: 'type',
        id: id,
        doc: attrs
      });
    });
  });
});
```

Run `npm test` and get the error:

```
1) PostsController update parses and returns post data:
   TypeError: posts.update is not a function
    at Context.it (test/controllers/posts.js:178:13)

2) PostsController update specifies proper index, type, id and attrs:
   TypeError: posts.update is not a function
    at Context.it (test/controllers/posts.js:186:20)
```

Let's define `update` method on controller then:

`app/controllers/posts.js`:

```
update(id, attrs) {
  return this.client.update({
    index: this.indexName,
    type: this.type,
    id: id,
    doc: attrs
  })
  .then((res) =>
    _.merge({ id: res._id }, attrs)
  );
}
```

That should fix everything if everything is done properly.

Now it's time to take care situation whet identifier of non existing resource is specified.

Test:

```
context('when there is no post with the specified id', () => {
  before(() =>
    client.update = () => {
      return new Promise((resolve, reject) =>
        resolve({
          "error": "DocumentMissingException[[node_api][3] [posts][AVhMJLOujQMgnw8euuFI]: document missing]",
          "status": 404
        })
      );
    }
  );

  it('returns rejected promise with the non existing post id', () =>
    posts.update(id, attrs).catch((result) =>
      result.should.equal(id)
    )
  );
});
```

And not let's add functionality:

```
update(id, attrs) {
  return this.client.update({
    index: this.indexName,
    type: this.type,
    id: id,
    doc: attrs
  })
  .then((res) =>
    new Promise((resolve, reject) => {
      if (res._id) {
        return resolve(_.merge({ id: res._id }, attrs));
      }

      reject(id);
    })
  );
}
```

So tests must be green again.

Ok. Our last action: `destroy`. Happy path tests first:

`test/controllers/posts.js`:

```
describe('destroy', () => {
  const id = "AVhMJLOujQMgnw8euuFI";

  before(() =>
    client.delete = () =>
      new Promise((resolve, reject) =>
        resolve({
          "found": true,
          "_index": "index",
          "_type": "type",
          "_id": id,
          "_version": 6
        })
      )
  );

  it('parses and returns post data', () =>
    posts.destroy(id).then((result) =>
      result.should.equal(id)
    )
  );

  it('specifies proper index, type and id', () => {
    const spy = sinon.spy(client, 'delete');

    return posts.destroy(id).then(() => {
      spy.should.be.calledOnce();
      spy.should.be.calledWith({
        index: 'index',
        type: 'type',
        id: id
      });
    });
  });
});
```

Run `npm test`. See the errors:

```
1) PostsController destroy parses and returns post data:
   TypeError: posts.destroy is not a function
    at Context.it (test/controllers/posts.js:234:13)

2) PostsController destroy specifies proper index, type and id:
   TypeError: posts.destroy is not a function
    at Context.it (test/controllers/posts.js:242:20)
```

Ok. Let's define `destroy` action then:

```
destroy(id) {
  return this.client.delete({
    index: this.indexName,
    type: this.type,
    id: id
  })
  .then((res) => id);
}
```

Green!!!

Now let's handle non existing resource.

Test:

```
context('when there is no post with the specified id', () => {
  before(() =>
    client.delete = () =>
      new Promise((resolve, reject) =>
        resolve({
          "found": false,
          "_index": "index",
          "_type": "type",
          "_id": id,
          "_version": 6
        })
      )
  );

  it('returns rejected promise with the non existing post id', () =>
    posts.destroy(id).catch((result) =>
      result.should.equal(id)
    )
  );
});
```

And functionality after:

```
destroy(id) {
  return this.client.delete({
    index: this.indexName,
    type: this.type,
    id: id
  })
  .then((res) =>
    new Promise((resolve, reject) => {
      if (res.found) {
        return resolve(id);
      }

      reject(id);
    })
  );
}
```

Green!!!!

Ok. So now we have all functionality we wanted. Let's clean up our code a little.

Right now we have repetitive pattern in our `app/controllers/posts.js`:

```
{
  index: this.indexName,
  type: this.type
  ...
}
```

Let's try to DRY it and extract all such pattern to the dedicated class:

`app/lib/resource.js`:

```
const _ = require('lodash');

module.exports = class {
  constructor(client, indexName, type) {
    this.client = client;
    this.baseParams = { index: indexName, type: type };
  }

  search() {
    return this.client.search(this.baseParams);
  }

  create(attrs) {
    return this.client.index(_.merge({ body: attrs }, this.baseParams));
  }

  get(id) {
    return this.client.get(_.merge({ id: id }, this.baseParams));
  }

  update(id, attrs) {
    return this.client.update(_.merge({ id: id, doc: attrs }, this.baseParams));
  }

  delete(id) {
    return this.client.delete(_.merge({ id: id }, this.baseParams));
  }
};
```

That simplified our controller a bit:

```
const _ = require('lodash');
const Resource = require('../lib/resource');

module.exports = class {
  constructor(client, indexName, type) {
    this.resource = new Resource(client, indexName, type);
  }

  index() {
    return this.resource.search()
      .then((res) =>
        _.map(res.hits.hits, (hit) =>
          _.merge(hit._source, { id: hit._id })
        )
      );
  }

  create(attrs) {
    return this.resource.create(attrs)
      .then((res) =>
        _.merge({ id: res._id }, attrs)
      );
  }

  show(id) {
    return this.resource.get(id)
      .then((res) =>
        new Promise((resolve, reject) => {
          if (res.found) {
            return resolve(_.merge({ id: res._id }, res._source));
          }

          reject(id);
        })
      );
  }

  update(id, attrs) {
    return this.resource.update(id, attrs)
      .then((res) =>
        new Promise((resolve, reject) => {
          if (res._id) {
            return resolve(_.merge({ id: res._id }, attrs));
          }

          reject(id);
        })
      );
  }

  destroy(id) {
    return this.resource.delete(id)
      .then((res) =>
        new Promise((resolve, reject) => {
          if (res.found) {
            return resolve(id);
          }

          reject(id);
        })
      );
  }
};
```

So we extracted all our interaction into special dedicated `Resource` class. But results parsing
is still in the controller. Let's extract it into the special `Parser` class:

`app/lib/parser.js`:

```
const _ = require('lodash');

module.exports = class {
  parseSearchResult(res) {
    return _.map(res.hits.hits, (hit) =>
      _.merge(hit._source, { id: hit._id })
    );
  }

  parseCreateResult(attrs) {
    return (res) => _.merge({ id: res._id }, attrs);
  }

  parseGetResult(res) {
    return new Promise((resolve, reject) => {
      if (res.found) {
        return resolve(_.merge({ id: res._id }, res._source));
      }

      reject(res._id);
    });
  }

  parseUpdateResult(id, attrs) {
    return (res) =>
      new Promise((resolve, reject) => {
        if (res._id) {
          return resolve(_.merge({ id: res._id }, attrs));
        }

        reject(id);
      });
  }

  parseDeleteResult(id) {
    return (res) =>
      new Promise((resolve, reject) => {
        if (res.found) {
          return resolve(id);
        }

        reject(id);
      });
  }
};
```

And our controller after:

```
const Resource = require('../lib/resource');
const Parser = require('../lib/parser');

module.exports = class {
  constructor(client, indexName, type) {
    this.resource = new Resource(client, indexName, type);
    this.parser = new Parser();
  }

  index() {
    return this.resource.search().then(this.parser.parseSearchResult);
  }

  create(attrs) {
    return this.resource.create(attrs).then(this.parser.parseCreateResult(attrs));
  }

  show(id) {
    return this.resource.get(id).then(this.parser.parseGetResult);
  }

  update(id, attrs) {
    return this.resource.update(id, attrs).then(this.parser.parseUpdateResult(id, attrs));
  }

  destroy(id) {
    return this.resource.delete(id).then(this.parser.parseDeleteResult(id));
  }
};
```

It looks much bettter now!
