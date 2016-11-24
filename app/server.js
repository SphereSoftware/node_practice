const restify = require('restify');

module.exports = (posts) => {
  const server = restify.createServer();

  server.use(restify.bodyParser());

  server.get('/posts/:id', (req, res, next) =>
    posts.show(req.params.id).then((result) =>
      res.send(200, result)
    ).catch(() => res.send(404))
  );

  server.post('/posts/:id', (req, res, next) =>
    posts.update(req.params.id, req.params.post).then((result) =>
      res.send(200, result)
    )
  );

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
