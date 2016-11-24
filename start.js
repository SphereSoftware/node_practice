const client = require('./app/client');
const serverFactory = require('./app/server');
const PostsController = require('./app/controllers/posts');

const posts = new PostsController(client, 'node_api', 'posts');
const server = serverFactory(posts);

server.listen(8080, () =>
  console.log('%s listening at %s', server.name, server.url)
);
