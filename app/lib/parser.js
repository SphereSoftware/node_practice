const _ = require('lodash');

module.exports = class {
  parseSearchResult(res) {
    return _.map(res.hits.hits, (hit) =>
      _.merge(hit._source, { id: hit._id })
    );
  }

  parseCreateResult(attrs) {
    return (res) => _.merge({ id: res._id }, attrs);
  }

  parseGetResult(res) {
    return new Promise((resolve, reject) => {
      if (res.found) {
        return resolve(_.merge({ id: res._id }, res._source));
      }

      reject(res._id);
    });
  }

  parseUpdateResult(id, attrs) {
    return (res) =>
      new Promise((resolve, reject) => {
        if (res._id) {
          return resolve(_.merge({ id: res._id }, attrs));
        }

        reject(id);
      });
  }

  parseDeleteResult(id) {
    return (res) =>
      new Promise((resolve, reject) => {
        if (res.found) {
          return resolve(id);
        }

        reject(id);
      });
  }
};
