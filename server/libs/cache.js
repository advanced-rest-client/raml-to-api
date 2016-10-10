'use strict';

var GDatastore = require('@google-cloud/datastore');
var datastoreOptions;
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
  datastoreOptions = {
    projectId: process.env.GCLOUD_PROJECT || 'raml-to-api'
  };
}
var datastore = GDatastore(datastoreOptions);

class ApiCache {

  /**
   * Finds saved RAML file.
   */
  get(url) {
    var key = datastore.key(['Api', url]);
    return new Promise((resolve, reject) => {
      datastore.get(key, function(err, entity) {
        if (err) {
          return reject(err);
        }
        resolve(entity);
      });
    });
  }

  /**
   * Saves new API data to the store.
   *
   * @param {String} url API file location
   * @param {String} etag An etag header from the file response (if any). It will be used to
   * make another request to the same location and check if file changed.
   * @param {int} time File last access time.
   * @param {Object} api Parsed APPI definition.
   */
  save(url, etag, time, api) {
    var key = datastore.key(['Api', url]);
    var data = [{
      name: 'url',
      value:  url
    },{
      name: 'etag',
      value:  etag,
      excludeFromIndexes: true
    },{
      name: 'time',
      value:  time,
      excludeFromIndexes: true
    },{
      name: 'api',
      value:  api,
      excludeFromIndexes: true
    }];
    return new Promise((resolve, reject) => {
      datastore.save({
        key: key,
        data: data
      }, function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
exports.ApiCache = ApiCache;
