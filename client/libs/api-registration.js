'use strict';

class ApiRegistration {
  constructor() {
    this._target = window.navigator;
    this._providers = {};
    this._ramls = {};
    this._pendingPromises = [];
    this.parserEndpoint = 'https://raml-to-api.appspot.com/?api=';
    this._apiLookupReady = false;
    this.registerProviderApi();
    this.lookupProviders().then(() => {
      this._apiLookupReady = true;
      this._firePending();
      this.fire('api-providers-registered', {});
    });
  }

  // Registers `requestApiProvider` function in the navigator namespace.
  registerProviderApi() {
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
      throw new Error('API name is required.');
    }
    if (!this._apiLookupReady) {
      return new Promise((resolve, reject) => {
        this._pendingPromises.push({
          name: apiName,
          resolve: resolve,
          reject: reject
        });
      });
    }
    if (apiName in this._providers) {
      return Promise.resolve(this._providers[apiName]);
    }
    return Promise.reject(new Error('API ' + apiName  + ' is unknown.'));
  }
  
  _firePending() {
    this._pendingPromises.forEach((i) => {
      if (i.name in this._providers) {
        i.resolve(this._providers[i.name]);
      } else {
        i.reject(new Error('API ' + i.name  + ' is unknown.'));
      }
    });
  }

  fire(eventName, detail) {
    var event = new CustomEvent(eventName, {
      detail: detail,
      bubbles: true,
      cancelable: true
    });
    document.body.dispatchEvent(event);
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
    this._providers[name] = new Api(api.specification);
    this._ramls[name] = api;
  }
}
window.exports = window.exports || window;
window.exports.ApiRegistration = ApiRegistration;
