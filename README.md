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
var supertest = require('supertest');
var Server = require('../app/server');

describe('Server', function() {
  var request = supertest(new Server());

  describe('GET /posts', function(don) {
    request.post('/posts').expect(200, done);
  });
})
```
