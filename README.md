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
