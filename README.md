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
