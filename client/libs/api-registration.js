'use strict';

class ApiRegistration {
  constructor() {
    this._target = navigator;
    this._providers = {};
    this.registerProvider();
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
  requestApiProvider(options) {
    var name = options.name || undefined;
    
  }
}

exports.ApiRegistration = ApiRegistration;
