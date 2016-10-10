'use strict';

class ApiRegistration {
  constructor() {
    this._target = navigator;
    this._providers = {};
    this.parserEndpoint = 'https://raml-to-api.appspot.com/?api=';
    this.registerProvider();
    this.lookupProviders();
  }
  // Registers `requestApiProvider` function in the navigator namespace.
  registerProvider() {
    if ('requestApiProvider' in this._target) {
      return;
    }
    this._target.requestApiProvider = this.requestApiProvider.bind(this);
  }
  /**
   * Requests an API provider for given options.
   */
  requestApiProvider(apiName) {
    if (!apiName) {

    }

  }

  lookupProviders() {
    var s = 'link[rel="alternate"][type="application/raml"][title][href]';
    var nodes = Array.from(document.querySelectorAll(s));
    var promises = nodes.map((node) => {
      let apiName = node.getAttribute('title');
      let ramlHref = node.getAttribute('href');
      return this._registerApiProvider({
        name: apiName,
        src: ramlHref
      });
    });
    return Promise.all(promises);
  }

  _registerApiProvider(opts) {
    return this._getApi(opts.src)
    .then((apiJson) => {
      if (!apiJson) {
        return false;
      }
      if (apiJson.error) {
        console.warn(apiJson.message);
        return false;
      }
      return this._createApiObject(opts.name, apiJson);
    });
  }

  _getApi(src) {
    src = encodeURIComponent(this._getSrc(src));
    var url = `${this.parserEndpoint}${src}`;
    var init = {
      'headers': {
        'x-client-id': 'raml-to-api-client'
      },
      cache: 'force-cache',
      redirect: 'follow'
    };
    return fetch(url, init).then((response) => {
      // if (!response.ok) {
      //   return null;
      // }
      return response.json();
    });
  }

  _getSrc(src) {
    if (src.indexOf('http') === 0) {
      return src;
    }
    if (src[0] === '/') {
      return location.origin + '/' + src;
    }
    return location.origin + location.pathname + src;
  }

  _createApiObject(name, api) {
    var obj = {};
    this._createStructure(api.specification, obj);
    this._providers[name] = obj;
  }

  _createStructure(api, src) {
    if (!('resources' in api)) {
      return;
    }
    api.resources.forEach((res) => {
      let name = res.relativeUri.replace(/\/g/, '');
      let properties = {};
      let desc = res.description || '';
      properties.docs = desc;

      src[name] = {};
    });
  }
}

exports.ApiRegistration = ApiRegistration;
