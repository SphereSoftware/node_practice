#Introduction

The main idea of this article is to describe test driven step - by - step development of the simple RESTful API to an Elasticsearch resource in Node.js

There are a lot of articles that are concentrated on interaction between Node.js and Elasticsearch instances. And good solutions are described there. But it's not always obvious how such result was achieved. 

I'm a big fun of TDD so I decided to try to build simple ES API guided by TDD practices. 

Propose API will provide a RESTfull access to the blog posts that have 3 attributes: `id`, `author`, and `content`.

Below you can see what is resulted from the such attempt. 

It's assumed that reader of this article has some basic understanding of the Node.js and Elasticsearch.

#Proposed architecture

Ok. So let's start from the generall API architecture that I'm going to achieve. Some elements of the MVC patters can be successfully reused here. Strictly speaking I'm gonna use only one element of that pattern: controller. See details on the schema below: 

![Generall Architecture](images/NodePracticeArchitecture.png)

Everything that is going to be developed is inside greyed rounded rectangle. 	
#Development

##Preparations

Create application directory:

```shell
mkdir npm_api
cd npm_api
```

Initialize git repository:

```shell
git init
```

Initialize npm application:

```shell
npm init
```

Accept all proposed default values there.

Now it's time to install our test framework. Personally I like [Mocha](https://mochajs.org/) and it is used in the article below. So you need to install it first: 

```shell
npm install --save-dev mocha
```

And create empty directory for tests: 

```shell
mkdir test
```

Now configure [Mocha](https://mochajs.org/) as default test framework in the `package.json`:

```json
"scripts": {
  "test": "node_modules/.bin/mocha"
}
```

Everything above makes it possible to run tests with the default npm command:

```shell
npm test
```

You should see something like `No test files found` in the output.

That is reasonable. We have not created any test so far. In order to do it we need to install [supertest](https://github.com/visionmedia/supertest) library for requests testing:

```shell
npm install --save-dev supertest
```

And now we are ready to create our first test:

`test/server.js`:

```javascript
describe('server', () => {
  const request = supertest(server);

  //checks that server returns success response when 'GET /posts' is performed
  //response content is not verified here yet. It will be done in the next
  //iteration 
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

```shell
Error: Cannot find module '../app/server'
```

Ok. So we don't have `server` defined yet. Let's create it.

I will use [restify](http://restify.com/) package for building web api: 

```shell
npm install --save-dev restify
```

And here is the basic trivial server just to make our only test green:

```javascript
const restify = require('restify');
const server = restify.createServer();

//Server always responds with the empty object for now. Content 
//is not tested yet. Just server availability is tested. 
server.get('/posts', (req, res, next) =>
  res.send({})
);

module.exports = server;
```

You can see that this is the very trivial server definition. It has only one action defined `GET /posts` that always returns empty object. If everything is done properly then `npm test` would output:

```shell
server
  GET /posts
    ✓ responds with OK


1 passing (32ms)
```

So now we have server that responds to `GET /posts` properly. 

It's perfect time to make first manual integration test to check that all pices that we alreade created fits properly to each other. 

First we need to create script that runs server: 

`./start.js`:

```javascript
const server = require('./app/server');

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

and then update `package.json` to defined it as application start script:

`package.json`:

```json
...
"script": {
  "test": "node_modules/.bin/mocha",
  "start": "node start.js"
}
...
```

and run server itself:

```shell
npm start
```

As a result we should see that server is running and ready to accept requests on the port `8080`:

```shell
> node_api@1.0.0 start /projects/node_api
> node start.js

restify listening at http://[::]:8080
```

And it always responds with the empty object as it was expected:

```shell
curl -XGET http://localhost:8080/posts
{}%
```

So now we have an API server that is ready to respond to our requests.

## Server development

According to proposed architecture server should redirect all requests to the controller - `PostsController` in our case. 

Let's extract that controller from the current server implementation:

`app/controllers/posts.js`:

```javascript
module.exports = class {
  index() {
    //even at this early phase we can assume that controller will return
    //some kind of promise because it will make a request to ES that 
    //are asynchronous
    return new Promise((resolve, reject) =>
      resolve({})
    );
  }
};
```

That is simplest possible controller version. And modify our server to use that controller:

```javascript
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

Ok. So now we have a controller instance that is created INSIDE the server. But to be able to write isolated unit tests of the server we need some way to pass fake controller to the server and then ensure that all method on that fake controller are called with proper parameters. 

So the server should be modified to be able to accept controller instance:

`app/server.js`:

```javascript
const restify = require('restify');

//PostsController intance must be created and passed from outside
module.exports = (posts) => {
  const server = restify.createServer();

  server.get('/posts', (req, res, next) =>
    posts.index().then((result) =>
      //we are not testing content here just server availability
      res.send(200)
    )
  );

  return server;
};
```

As result we defined rather server factory than server definition. And that server factory create server instance based on the controller paramter that it accepts. 

Now we are ready to modify server test and specify fake controller instance there:

`test/server.js`:

```javascript
const supertest = require('supertest');
const server = require('../app/server');

describe('server', () => {
  //PostsController stub
  const posts = {};
  const request = supertest(server(posts));

  describe('GET /posts', () => {
    //test function that is called by the server instance
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

You can see above that `posts` is a just simple plain object used as a controller stub object and has only one method `index` is defined on it. That makes it possible to controll both result that is returned to the server from the controller and params that are passed from the server to the controller. I will explan it in details below

Ok. So if everyhitng is done properly then all tests should be green now. Try it: 

```shell
npm test
```

Also we need to modify our start script and pass real `PostsController` instance to the server instance there:

`./start.js`:

```javascript
const serverFactory = require('./app/server');
const PostsController = require('./app/controllers/posts');

const posts = new PostsController();
const server = serverFactory(posts);

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

It might a good idea to make some simple integration test now and check that nothing is broken. 

Run server first to do that:

```shell
npm start
```

And send a test request to it after:

```
curl -XGET http://localhost:8080/posts
{}%
```

Empty object is returned and that is exactly what was expected. 

Now we have everyhing prepared for the content testing. Under content testing I mean checking that server properly serializes data that is returned from the controller and responds with that data. 

First we need to update test so it became red:

`test/server.js`:

```javascript
const _ = require('lodash');
const supertest = require('supertest');
const server = require('../app/server');

describe('server', () => {
  const posts = {};
  const request = supertest(server(posts));

  describe('GET /posts', () => {
    //test data that is returned by the posts controller stub
    const data = [{id: 1, author: 'Mr. Smith', content: 'Now GET /posts works'}];

	 //test method now returns test data
    before(() => {
      posts.index = () =>
        new Promise((resolve, reject) =>
          resolve(data)
        );
    });

    //checks that server responds with the proper HTTP code and exactly with the     
    //same data it received from the controller
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

```shell
Error: expected [ { id: 1, author: 'Mr. Smith', content: 'Now GET /posts works' } ] response body, got {}
```

So looks like server does not return posts data. Let's update server then:

```javascript
const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  server.get('/posts', (req, res, next) =>
    posts.index().then((result) =>
      //now we returns not only code but content also
      res.send(200, result)
    )
  );

  return server;
};
```

If you run `npm test` now you should see that all tests are green. Nice!

Ok. Now it's time to add support of the one more action to our serve - `POST /posts` that will create new post instance.

Test first:

`test/server.js`:

```javascript
describe('POST /posts', () => {
  //data that is sent to the server
  const data = [{ author: 'Mr. Rogers', content: 'Now POST /posts works' }];

  before(() => {
    //so we expect server to return attributes fo the new post
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

run `npm test` and see the error like that:

```shell
Error: expected { '0': { author: 'Mr. Rogers', content: 'Now POST /posts works' },
  id: 2 } response body, got { code: 'MethodNotAllowedError',
  message: 'POST is not allowed' }
```

Expected result actually. `POST /posts` must be defined on the server to fix test:

`app/server.js`:

```javascript
//So here we just pass post attributes to the controller and returns back 
//its result
server.post('/posts', (req, res, next) =>
  posts.create(req.params.post).then((result) =>
    res.send(201, result)
  )
);
```

But even if we run `npm test` we will still see an error:

```shell
Error: expected { '0': { author: 'Mr. Rogers', content: 'Now POST /posts works' },
  id: 2 } response body, got { id: 2 }
```

It looks like params that we sent to the server were not parsed properly. Let's plug body parser into the server:

`app/server.js`:

```javascript
const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  //we need that parser to work with params that are defined in 
  //the request body
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

Next action that I'm gonna add - `GET /posts/:id`. This action is different from the previous two. It's tricky in that way that API consumer might specify non existing post identifies that server must handle graciously. 

For now let's implement simplified action version - without handling request to non existing posts 

Test first as usual:

`test/server.js`

```javascript
describe('GET /posts/:id', () => {
  //data that is returned from the controller stub
  const data = [{ author: 'Mr. Williams', content: 'Now GET /posts/:id works' }];

  //show action stub. it merges specified id with the predefined data
  //to imitate real controller behaviour at one hand and
  //check that proper id was passed to the controller at another one
  before(() => {
    posts.show = (id) =>
      new Promise((resolve, reject) =>
        resolve(_.merge({ id: id }, data))
      );
  });

  //checks that server just pass id to the controller and 
  //returns its result. 
  it('responds with OK and returns content of the post', () =>
    request
      .get('/posts/3')
      .send(data)
      .expect(_.merge({ id: 3 }, data))
      .expect(200)
  );
});
```

Run `npm test` now and get an error:

```shell
Error: expected { '0': { author: 'Mr. Williams', content: 'Now GET /posts/:id works' },
  id: 3 } response body, got { code: 'ResourceNotFound', message: '/posts/3 does not exist' }
```

So resource is not found. We need to define action on the server to make test happy:

`app/server.js`:

```javascript
server.get('/posts/:id', (req, res, next) =>
  posts.show(req.params.id).then((result) =>
    res.send(200, result)
  )
);
```

Run test and now everything should be green!

But what about the case where there is no post with the specified id? Server obviously should return NotFound (404) HTTP status in this case.

Let's add test first:

`test/server.js`:

```javascript
context('when there is no post with the specified id', () => {
  //here its assumed that controller will return rejected promice
  //when post with the specified id is not found
  before(() => {
    posts.show = (id) =>
      new Promise((resolve, reject) =>
        reject(id)
      );
  });

  //test that server responds with 404 code if post was not found
  it('responds with NotFound', () =>
    request
      .get('/posts/3')
      .send(data)
      .expect(404)
  );
});
```

Run `npm test` again and get an error:

```shell
Error: timeout of 2000ms exceeded. Ensure the done() callback is being called in this test.
```

That happened because promise in the controller stub is rejected and that is not handled by the server.

Let's handle that:

`app/server.js`:

```javascript
server.post('/posts', (req, res, next) =>
  posts.show(req.params.id).then((result) =>
    res.send(200, result)
  ).catch(() => res.send(404))
);
```

Run tests again. And now all of them should be green :)

Next action in line - update: `POST /posts/:id`. Similiarly to the previous action we develop happy path first assuming that correct post id is specified. Situation when invalid id is specified will be considered later. 

Test first as usuall:

```javascript
describe('POST /posts/:id', () => {
  //data that is sent to the server
  var data = [{ author: 'Mr. Williams', content: 'Now POST /posts/:id works' }];

  //test actions returns specified attributes merged with the
  //specified identified so it's possible to control correctness
  //of the parameters that were passed to the controller stub
  before(() => {
    posts.update = (id, attrs) =>
      new Promise((resolve, reject) =>
        resolve(_.merge({ id: id }, attrs))
      );
  });

  //and in the test below response data and status are verified
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

```shell
 Error: expected { '0': { author: 'Mr. Williams', content: 'Now POST /posts/:id works' },
  id: 4 } response body, got { code: 'MethodNotAllowedError',
  message: 'POST is not allowed' }
```

Ok. So let's define missing method:

`app/server.js`:

```javascript
server.post('/posts/:id', (req, res, next) =>
  posts.update(req.params.id, req.params.post).then((result) =>
    res.send(200, result)
  )
);
```

So now we have server update action that is capable to handle existing resource.  It's time to handle the case when identifier of non existing post specified. 

Start from the test:

`test/server.js`:

```javascript
context('when there is no post with the specified id', () => {
  before(() => {
    posts.update = (id) =>
      new Promise((resolve, reject) =>
        reject(id)
      );
  });

  it('responds with 404 HTTP response', () =>
    request
      .post('/posts/3')
      .send({ post: data })
      .expect(404)
  );
});
```

Run `npm test` and get an error:

```shell
Error: timeout of 2000ms exceeded. Ensure the done() callback is being called in this test.
```

Yeah. Than is reasonable. Rejected promises are not handled yet. Let's add error handling to the server action:

```javascript
server.post('/posts/:id', (req, res, next) =>
  posts.update(req.params.id, req.params.post).then((result) =>
    res.send(200, result)
  ).catch(() => res.send(404))
);
```

Run tests again. End we are green again!

So - there is only one action is left not implemented - `DELETE /posts/:id`. Now it's time to fill the gap. 

Action test:

```javascript
describe('DELETE /posts/:id', () => {
  //imitate action that always returns id of the deleted post
  before(() =>
    posts.destroy = (id) =>
      new Promise((resolve, reject) =>
        resolve({ id: id })
      )
  );

  //checks that server returns deleted post identified
  it('responds with the id of the deleted post', () =>
    request
      .delete('/posts/5')
      .expect({ id: 5 })
  );
});
```

Run it. Get an error. Define action on the server:

```javascript
server.del('/posts/:id', (req, res, next) =>
  posts.destroy(req.params.id).then((result) =>
    res.send(200, { id: req.params.id })
  )
);
```

Run tests again. Green!

And now let's handle the case that there is no post with the specified id:

Test first:

`test/server.js`:

```javascript
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

```javascript
server.del('/posts/:id', (req, res, next) =>
  posts.destroy(req.params.id).then((result) =>
    res.send(200, { id: req.params.id })
  ).catch(() => res.send(404))
);
```

Everything is green now.

So now we have fully workable server. It properly redirects requests data to the controller and writes serialized result to the response.

## Controller

So - `PostsController`. It will work with ES client. We can assume that ES client is well tested so we do not have to test it. Methods of the controller - those only should be be tested. To test controller in isolation we need to pass client stub to the controller instance to be able to verify that correct methods were called on the stub and returned data was properly handled. 

First - let's update `PostsController` definition so it accept client instance from the outside:

`app/controllers/posts.js`:

```javascript
module.exports = class {
  constructor(client) {
    this.client = client;
  }

  index() {
  	 //controller still always returns empty object
    return new Promise((resolve, reject) =>
      resolve({})
    );
  }
};
```

Alsow let's install another test library - `should` that will be used below:

```shell
npm install should --save-dev
```

Now let's introduce ES client stub in the posts controller test: 

`test/controllers/posts.js`:

```javascript
var PostsController = require('../../app/controllers/posts');

describe('PostsController', function() {
  var client = {};
  var posts = new PostsController(client);
});
```

Run tests. Everything still should be green. So we have everything prepared for `PostsController` development.

Let's write our first test - index action.

Test first:

```javascript
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

We see that possible ES response is imitated there. Run tests and see the failure: our current `PostsController` always returns empty object.

Let's change it:

```javascript
const _ = require('lodash');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  //index returns list of posts attributes merged with corresponding
  //identifiers
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

We tested that `PostsController` parsed ES result properly. But we also need to test that it passes correct params to the client.

There are two params that needs to be specified as parameters of the ES client method `search`: `index` and `type`. First let's add those params to `PostsController` constructor:

`app/controllers/posts.js`:

```javascript
//index and type names should be specified outside now
constructor(client, indexName, type) {
  this.client = client;
  this.indexName = indexName;
  this.type = type;
}
```

and now let's specifiy some test params in the `PostsController` specs:

`test/controller/posts.js`:

```javascript
describe('PostsController', () => {
  const client = {};
  //'index' and 'type' are some virtual index and type names 
  const posts = new PostsController(client, 'index', 'type');
  ...
}
```

run test again. Green. Nothing is broken. Great.

Now let's verify that we specified those params propely when called `client.search` method.

I'm gonna use [sinon](http://sinonjs.org/) for spying after method calls:

```shell
npm install sinon --save-dev
```

And `should-sinon` for should - like asserts for sinon:

```shell
npm install shold-sinon --save-dev
```

Require that in controller test:

`test/controllers/posts.js`:

```javascript
var sinon = require('sinon');
require('should-sinon');
```

So now we can write params verification test:

`test/controllers/posts.js`:

```javascript
it('specifies proper index and type while searching', () => {
  const spy = sinon.spy(client, 'search');

  //It's expected below that method search() is called once with
  //proper index name and object type as paramters. 
  return posts.index().then(() => {
    spy.should.be.calledOnce();
    spy.should.be.calledWith({
      index: 'index',
      type: 'type'
    });
  });
});
```

Run `npm test`. See the failure:

```shell
expected 'search' to be called with arguments { index: "index", type: "type" }
    search() => [Promise] {  } at PostsController.index (/projects/node_api/app/controllers/posts.js:14:22)
    expected false to be true
```

Ok. So now we need to update controller to make the test green:

`app/controllers/posts.js`:

```javascript
index() {
  //pass index name and object type to the controller
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

Tests should be green now. 

Now it's a good time for simple manual integration tests to be sure that all already created pieces of application fits well. 

Below its assumed that you have ES service installed locally and running on default 9200 port.

Let's do it. 

* Create index ( 'node_api' ):

```shell
curl -XPOST localhost:9200/node_api
```

expected output: 

```shell
{"acknowledged":true}%
```

* Create `post` example:

```shell
curl -XPOST localhost:9200/node_api/posts -d '{ "author": "Mr. Smith", "content": "Now GET /posts works!" }'
```

expected output:

```shell
{"_index":"node_api","_type":"posts","_id":"AViW9F1lhQ3AxSLOwi2k","_version":1,"created":true}%
```

* Install [elasticsearch](https://www.npmjs.com/package/elasticsearch) npm package:

```shell
npm install elasticsearch --save-dev
```

* Create ES client instance:

`./app/client.js`:

```javascript
const elasticsearch = require('elasticsearch');

module.exports = new elasticsearch.Client({
  host: 'localhost:9200'
});
```

* Update start script with the real index and type names:

`./start.js`:

```javascript
const client = require('./app/client');
const serverFactory = require('./app/server');
const PostsController = require('./app/controllers/posts');

const posts = new PostsController(client, 'node_api', 'posts');
const server = serverFactory(posts);

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
```

* Run server:

```shell
npm start
```

* Make test request:

```shell
curl -XGET http://localhost:8080/posts/1
```

And if everything done properly you should see somethis like that in output: 

```shell                                                                                                                            
[{"author":"Mr. Smith","content":"Now GET /posts works!","id":"AViW9F1lhQ3AxSLOwi2k"}]%
```

So our integration test succeed and we can continue adding methods to controller knowing that server is configured properly and calls proper controller methods. 

Now let's implement post indexing in ES.

Test first:

```javascript
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

There are two tests are defined above. In real life those tests should be done in two iteractions. We joined both them into one iteraction here for simplicity.

Run tests. See the errors. Add indexing support to controller:

```javascript
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

That should make tests green again if done properly. 

Next controller action - `show`. Similiarly to `GET /show/:id` this controller action should handle situation when post with the specified identifier does not exist. But we will take care about it later. Now let's start from the simplified action version assuming that only correct identifier can be ever specified.  

Test first as usuall:

`test/controllers/posts.js`:

```javascript
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

If you run `npm test` now you will see an error because method `show` not defined on the `PostsController`. You can see possible implementation below: 

`app/controllers/posts.js`:

```javascript
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

Run `npm test`. All tests should be green now. Than means that `PostsController` is able to find post and return it's content. But if somebody specified identifier of the non existing post then controller would fail. We need to handle that exceptional situation properly. 

First the case should be imitated in test:

`test/controllers/posts.js`:

```javascript
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

Run tests. Get an error. Update controller:

`app/controllers/posts.js`:

```javascript
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

Now everything including tests should be ok. We have fully implemented `show` action. 

Ok. Next action is `update`. As in case of `show` action we need to handle here the case when non existing post identifier is passed to the action and similiarly to the `show` we will handle that later and start from the simplified version. 

Tests first:

```javascript
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

```shell
1) PostsController update parses and returns post data:
   TypeError: posts.update is not a function
    at Context.it (test/controllers/posts.js:178:13)

2) PostsController update specifies proper index, type, id and attrs:
   TypeError: posts.update is not a function
    at Context.it (test/controllers/posts.js:186:20)
```

So `update` is not a function. Let's define `update` method then:

`app/controllers/posts.js`:

```javascript
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

Now it's time to take care situation whet identifier of a non existing resource is specified.

Test:

```javascript
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

Run tests. See failure and update definition of the method `update`:

```javascript
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

And the last action - `destroy`. Happy path tests first:

`test/controllers/posts.js`:

```javascript
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

And define `destroy` action then:

```javascript
destroy(id) {
  return this.client.delete({
    index: this.indexName,
    type: this.type,
    id: id
  })
  .then((res) => id);
}
```

That makes test green. So we are able to destroy post with the specified identifier. 

Now let's handle non existing resource.

Test:

```javascript
context('when there is no post with the specified id', () => {
  //ES returns "found" equals false if is not able to find resource
  //with the specified identifier.
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

  //checks that promise is rejected
  it('returns rejected promise with the non existing post id', () =>
    posts.destroy(id).catch((result) =>
      result.should.equal(id)
    )
  );
});
```

And functionality after:

```javascript
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

      //reject with the post identifier. 
      reject(id);
    })
  );
}
```

Now tests should be green. So now we have all API functionality completed. Post can be created, deleted, updated, listed. 

And finally let's make some clean up. Refactoring is a save and easy operation in our case besause everything is covered by the tests.

##Controller re - factoring

Right now we have repetitive pattern in our `app/controllers/posts.js`:

```javascript
{
  index: this.indexName,
  type: this.type
  ...
}
```

Let's try to DRY it and extract all such pattern to the dedicated class:

`app/lib/resource.js`:

```javascript
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

```javascript
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

So we extracted all our interaction into special dedicated `Resource` class. But results parsing is still in the controller. Let's extract it into the special `Parser` class:

`app/lib/parser.js`:

```javascript
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

And our controller after that:

```javascript
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

So we completed Node.js API for ES resource step by step leaded by the tests. The result is relatively simple and has reliable test coverage. I'm sure that each of the steps above are trivial and might be done quite easily without any debugging efforts. And that such approach leads to the better code and it's much faster then when code is created before tests.  
