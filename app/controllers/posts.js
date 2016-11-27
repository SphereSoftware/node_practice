const _ = require('lodash');

module.exports = class {
  constructor(client, indexName, type) {
    this.client = client;
    this.indexName = indexName;
    this.type = type;
  }

  index() {
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

        reject(id);
      })
    );
  }
};
