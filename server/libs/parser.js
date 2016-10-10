'use strict';

const raml = require('raml-1-parser');
const fetch = require('node-fetch');

class ApiParser {
  constructor(apiUrl) {
    if (!apiUrl) {
      throw new Error('apiUrl not set');
    }
    this.apiUrl = apiUrl;
  }

  run() {
    return this.loadApi()
      .then((api) => this.analyseApi(api));
  }

  setPreviousData(previous) {
    if (!previous) {
      return;
    }
    this.api = previous.api;
    this.etag = previous.etag;
    this.time = previous.time;
  }

  loadApi() {
    return this._fetchRaml(this.apiUrl)
    .then((resp) => {
      if (resp.cached) {
        resp.api = this.api;
        return resp;
      }
      return raml.parseRAML(resp.data, {
        fsResolver: {
          contentAsync: (path) => this.contentAsync(path)
        },
        httpResolver: {
          getResourceAsync: (path) => this.getResourceAsync(path)
        }
      }).then((api) => {
        resp.api = api;
        return resp;
      });
    });

  }

  analyseApi(data) {
    data.api = data.api.expand(true).toJSON({
      dumpSchemaContents: true,
      rootNodeDetails: true,
      serializeMetadata: false
    });
    return data;
  }

  _fetchRaml(url) {
    var init = {
      method: 'GET',
      headers: {
        'Upgrade-Insecure-Requests': 1
      },
      cache: 'default'
    };
    if (this.etag) {
      init.headers['If-None-Match'] = this.etag;
    } else if (this.time) {
      let d = new Date(this.time);
      init.headers['If-Modified-Since'] = d.toGMTString();
    }
    return fetch(url, init).then(function(response) {
      if (response.status === 304) {
        return {
          cached: true
        };
      }
      return response.text().then((data) => {
        return {
          cached: false,
          data: data,
          etag: response.headers.get('etag'),
          time: Date.now()
        };
      });
    });
  }

  /**
   * Handler for RAML's parser FsResolver.contentAsync.
   * It's purpose is to provide a content of the file.
   */
  contentAsync(path) {
    let url = this.apiUrl + path;
    return fetch(url).then((response) => {
      return response.text();
    });
  }
  /**
   * Handler for RAML's parser HttpResolver.getResourceAsync.
   * It's purpose is to provide a content of the file downloading it
   * from the URL.
   */
  getResourceAsync(path) {
    console.log('getResourceAsync', path);
    return fetch(path).then((response) => {
      return response.text();
    }).then((text) => {
      return {
        content: text
      };
    });
  }
}

exports.ApiParser = ApiParser;
