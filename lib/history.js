import Events from './events.js';

// Schmackbone.History
// ----------------
// Cached regex for stripping a leading hash/slash and trailing space.
const routeStripper = /^[#/]|\s+$/g;

// Cached regex for stripping leading and trailing slashes.
const rootStripper = /^\/+|\/+$/g;

// Cached regex for stripping urls of hash.
const pathStripper = /#.*$/;

// Handles cross-browser history management, based on
// [pushState](http://diveintohtml5.info/history.html) and real URLs
export default class History {
  constructor() {
    this.handlers = [];

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  }

  // Are we at the app root?
  atRoot() {
    var path = this.location.pathname.replace(/[^/]$/, '$&/');

    return path === this.root && !this.getSearch();
  }

  // Does the pathname match the root?
  matchRoot() {
    var path = this.decodeFragment(this.location.pathname);
    var rootPath = path.slice(0, this.root.length - 1) + '/';

    return rootPath === this.root;
  }

  // Unicode characters in `location.pathname` are percent encoded so they're
  // decoded for comparison. `%25` should not be decoded since it may be part
  // of an encoded parameter.
  decodeFragment(fragment) {
    return decodeURI(fragment.replace(/%25/g, '%2525'));
  }

  // In IE6, the hash fragment and search params are incorrect if the
  // fragment contains `?`.
  getSearch() {
    var match = this.location.href.replace(/#.*/, '').match(/\?.+/);

    return match ? match[0] : '';
  }

  // Gets the true hash value. Cannot use location.hash directly due to bug
  // in Firefox where location.hash will always be decoded.
  getHash(window) {
    var match = (window || this).location.href.match(/#(.*)$/);

    return match ? match[1] : '';
  }

  // Get the pathname and search params, without the root.
  getPath() {
    var path = this.decodeFragment(
      this.location.pathname + this.getSearch()
    ).slice(this.root.length - 1);

    return path.charAt(0) === '/' ? path.slice(1) : path;
  }

  // Get the cross-browser normalized URL fragment from the path or hash.
  getFragment(fragment) {
    /* eslint-disable eqeqeq */
    if (fragment == null) {
    /* eslint-enable eqeqeq */
      fragment = this.getPath();
    }

    return fragment.replace(routeStripper, '');
  }

  // Start the hash change handling, returning `true` if the current URL matches
  // an existing route, and `false` otherwise.
  start(options) {
    if (History.started) {
      throw new Error('Schmackbone.history has already been started');
    }

    History.started = true;

    // Figure out the initial configuration. Do we need an iframe?
    // Is pushState desired ... is it available?
    this.options = {...this.options, ...options, root: '/'};
    this.root = this.options.root;
    this.fragment = this.getFragment();

    // Normalize root to always include a leading and trailing slash.
    this.root = ('/' + this.root + '/').replace(rootStripper, '/');

    window.addEventListener('popstate', this.checkUrl, false);

    if (!this.options.silent) {
      return this.loadUrl();
    }
  }

  // Disable Schmackbone.history, perhaps temporarily. Not useful in a real app,
  // but possibly useful for unit testing Routers.
  stop() {
    // Remove window listeners.
    window.removeEventListener('popstate', this.checkUrl, false);

    // Clean up the iframe if necessary.
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = null;
    }

    History.started = false;
  }

  // Add a route to be tested when the fragment changes. Routes added later
  // may override previous routes.
  route(route, callback) {
    this.handlers.unshift({route, callback});
  }

  // Checks the current URL to see if it has changed, and if it has,
  // calls `loadUrl`, normalizing across the hidden iframe.
  checkUrl = () => {
    var current = this.getFragment();

    // If the user pressed the back button, the iframe's hash will have
    // changed and we should use that for comparison.
    if (current === this.fragment && this.iframe) {
      current = this.getHash(this.iframe.contentWindow);
    }

    if (current === this.fragment) {
      return false;
    }

    if (this.iframe) {
      this.navigate(current);
    }

    this.loadUrl();
  }

  // Attempt to load the current URL fragment. If a route succeeds with a
  // match, returns `true`. If no defined routes matches the fragment,
  // returns `false`.
  loadUrl(fragment) {
    // If the root doesn't match, no routes can match either.
    if (!this.matchRoot()) {
      return false;
    }

    fragment = this.fragment = this.getFragment(fragment);

    return this.handlers.some((handler) => {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);

        return true;
      }

      return false;
    });
  }

  // Save a fragment into the hash history, or replace the URL state if the
  // 'replace' option is passed. You are responsible for properly URL-encoding
  // the fragment in advance.
  //
  // The options object can contain `trigger: true` if you wish to have the
  // route callback be fired (not usually desirable), or `replace: true`, if
  // you wish to modify the current URL without adding an entry to the history.
  navigate(fragment, options) {
    if (!History.started) {
      return false;
    }

    if (!options || options === true) {
      options = {trigger: !!options};
    }

    // Normalize the fragment.
    fragment = this.getFragment(fragment || '');

    // Don't include a trailing slash on the root.
    let rootPath = this.root;

    if (fragment === '' || fragment.charAt(0) === '?') {
      rootPath = rootPath.slice(0, -1) || '/';
    }

    let url = rootPath + fragment;

    // Strip the fragment of the query and hash for matching.
    fragment = fragment.replace(pathStripper, '');

    // Decode for matching.
    let decodedFragment = this.decodeFragment(fragment);

    if (this.fragment === decodedFragment) {
      return;
    }

    this.fragment = decodedFragment;

    // If pushState is available, we use it to set the fragment as a real URL.
    this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

    if (options.trigger) {
      return this.loadUrl(fragment);
    }
  }

  // Has the history handling already been started?
  static started = false;
}

// Set up all inheritable **Schmackbone.History** properties and methods.
Object.assign(History.prototype, Events);

export const history = new History;
