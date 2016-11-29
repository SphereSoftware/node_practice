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

