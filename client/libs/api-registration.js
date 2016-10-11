'use strict';

class ApiRegistration {
  constructor() {
    this._target = window.navigator;
    this._providers = {};
    this.parserEndpoint = 'https://raml-to-api.appspot.com/?api=';
    this.registerProviderApi();
    this.lookupProviders().then(() => {
      console.log(Object.getOwnPropertyNames(this._providers['api-name']));
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

    }

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
        console.log('aaaaaaaaaaaaaaaaaaaaa');
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
    this._providers[name] = this._createStructure(api.specification, api.specification.resources);
  }

  _createStructure(root, resources, dest) {
    if (!resources) {
      return;
    }
    dest = dest || {};

    resources.forEach((res) => {
      let name = res.relativeUri.replace(/\//g, '');
      let properties = {};
      let desc = res.description || '';
      properties.docs = desc;
      if ('methods' in res) {
        this._registerMethods(root, res.methods, properties);
      }
      if ('resources' in res) {
        this._createStructure(root, res.resources, properties);
      }
      console.log('properties', properties);
      dest[name] = properties;
    });
    return dest;
  }

  _registerMethods(src, methods, dest) {
    if (!methods || !methods.length) {
      return;
    }
    for (let i = 0, len = methods.length; i < len; i++) {
      let method = methods[i];
      let httpMethod = method.method;
      dest[httpMethod] = function() {

      };
      dest[httpMethod].docs = method.description || '';
    }
  }
}
if (window.exports) {
  exports.ApiRegistration = ApiRegistration;
}
