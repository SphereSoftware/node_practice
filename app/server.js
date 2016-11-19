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
