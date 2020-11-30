import {isFunction, isRegExp, result} from 'underscore';

import Events from './events.js';
import {history} from './history.js';

// Schmackbone.Router
// ---------------

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
const optionalParam = /\((.*?)\)/g;
const namedParam = /(\(\?)?:\w+/g;
const splatParam = /\*\w+/g;
const escapeRegExp = /[-{}[\]+?.,\\^$|#\s]/g;

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.
export default class Router {
  constructor(options={}) {
    this.preinitialize(...arguments);

    if (options.routes) {
      this.routes = options.routes;
    }

    this._bindRoutes();
    this.initialize(...arguments);
  }

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Router.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // Manually bind a single named route to a callback. For example:
  //
  //     this.route('search/:query/p:num', 'search', function(query, num) {
  //       ...
  //     });
  //
  route(route, name, callback) {
    var router = this;

    if (!isRegExp(route)) {
      route = this._routeToRegExp(route);
    }

    if (isFunction(name)) {
      callback = name;
      name = '';
    }

    if (!callback) {
      callback = this[name];
    }

    history.route(route, (fragment) => {
      var args = router._extractParameters(route, fragment);

      if (router.execute(callback, args, name) !== false) {
        router.trigger(...['route:' + name].concat(args));
        router.trigger('route', name, args);
        history.trigger('route', router, name, args);
      }
    });

    return this;
  }

  // Execute a route handler with the provided parameters.  This is an
  // excellent place to do pre-route setup or post-route cleanup.
  execute(callback, args, name) {
    if (callback) {
      callback.apply(this, args);
    }
  }

  // Simple proxy to `Schmackbone.history` to save a fragment into the history.
  navigate(fragment, options) {
    history.navigate(fragment, options);

    return this;
  }

  // Bind all defined routes to `Schmackbone.history`. We have to reverse the
  // order of the routes here to support behavior where the most general
  // routes can be defined at the bottom of the route map.
  _bindRoutes() {
    var route,
        routes;

    if (!this.routes) {
      return;
    }

    this.routes = result(this, 'routes');

    routes = Object.keys(this.routes);

    /* eslint-disable eqeqeq */
    while ((route = routes.pop()) != null) {
      this.route(route, this.routes[route]);
    }
    /* eslint-enable eqeqeq */
  }

  // Convert a route string into a regular expression, suitable for matching
  // against the current location hash.
  _routeToRegExp(route) {
    route = route.replace(escapeRegExp, '\\$&')
        .replace(optionalParam, '(?:$1)?')
        .replace(namedParam, (match, optional) => optional ? match : '([^/?]+)')
        .replace(splatParam, '([^?]*?)');

    return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
  }

  // Given a route, and a URL fragment that it matches, return the array of
  // extracted decoded parameters. Empty or unmatched parameters will be
  // treated as `null` to normalize cross-browser behavior.
  _extractParameters(route, fragment) {
    var params = route.exec(fragment).slice(1);

    return params.map((param, i) => {
      // Don't decode the search params.
      if (i === params.length - 1) {
        return param || null;
      }

      return param ? decodeURIComponent(param) : null;
    });
  }
}

// Set up all inheritable **Schmackbone.Router** properties and methods.
Object.assign(Router.prototype, Events);
