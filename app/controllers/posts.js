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
