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

And now we are ready to create our first test ( test/server.js ):

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

So now we have server that responds to `GET /posts` properly.
