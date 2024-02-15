class ServiceCollection {
  constructor() {
    this.services = {};

    this.filteredClients = (key) => {
      this.services[key] = this.services[key].filter((r) => r && r._readyState === 1);
    };
  }

  send(key, scope, message) {
    if (this.services[key]) {
      this.filteredClients(key);
      this.services[key].forEach((client) => {
        client.send(
          JSON.stringify({
            scope,
            message,
          })
        );
      });
    }
  }

  addSingleton(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'singleton',
    };
  }

  addScoped(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'scoped',
    };
  }

  addTransient(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'transient',
    };
  }

  getService(_name, getClass = false) {
    let responseInstance;
    if (_name in this.services) {
      const service = this.services[_name];
      const { type, Method, instance, params } = service;
      switch (type) {
        case 'singleton':
          if (!instance) service.instance = new Method(params);
          responseInstance = getClass ? Method : service.instance;
          break;
        case 'scoped':
          responseInstance = getClass ? Method : new Method(params);
          break;
        case 'transient':
          responseInstance = getClass ? Method : new Method(params);
          break;
        default:
          responseInstance = getClass ? Method : new Method(params);
          break;
      }
    }
    return responseInstance;
  }
}

const serviceCollection = new ServiceCollection();

const TimezoneService = require('./shared/timezone.service');
const RedisCache = require('./cache/RedisCache');

serviceCollection.addTransient('timezoneService', TimezoneService, {});
serviceCollection.addSingleton('redisCacheStore', RedisCache, { connect: true });

module.exports = serviceCollection;
