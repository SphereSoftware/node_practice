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
