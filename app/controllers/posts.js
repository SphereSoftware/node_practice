module.exports = class {
  constructor(client) {
    this.client = client;
  }

  index() {
    return new Promise((resolve, reject) =>
      resolve({})
    );
  }
};
