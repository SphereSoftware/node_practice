const _ = require('lodash');

module.exports = class {
  constructor(client, indexName, type) {
    this.client = client;
    this.indexName = indexName;
    this.type = type;
  }

  index() {
    return this.client
      .search({
        index: this.indexName,
        type: this.type
      })
      .then((res) =>
        _.map(res.hits.hits, (hit) =>
          _.merge(hit._source, { id: hit._id })
        )
      );
  }
};
