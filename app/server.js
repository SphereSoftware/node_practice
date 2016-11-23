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
