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
