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
