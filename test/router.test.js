import {history} from '../lib/history';
import Router from '../lib/router';

var router = null;
var lastRoute = null;
var lastArgs = [];

const onRoute = function(routerParam, route, args) {
  lastRoute = route;
  lastArgs = args;
};

const ExternalObject = {
  value: 'unset',

  routingFunction(value) {
    this.value = value;
  }
};

ExternalObject.routingFunction = ExternalObject.routingFunction.bind(ExternalObject);

class _Router extends Router {
  count = 0

  routes() {
    return {
      noCallback: 'noCallback',
      counter: 'counter',
      'search/:query': 'search',
      'search/:query/p:page': 'search',
      charñ: 'charUTF',
      'char%C3%B1': 'charEscaped',
      contacts: 'contacts',
      'contacts/new': 'newContact',
      'contacts/:id': 'loadContact',
      'route-event/:arg': 'routeEvent',
      'optional(/:item)': 'optionalItem',
      'named/optional/(y:z)': 'namedOptional',
      'splat/*args/end': 'splat',
      ':repo/compare/*from...*to': 'github',
      'decode/:named/*splat': 'decode',
      '*first/complex-*part/*rest': 'complex',
      'query/:entity': 'query',
      'function/:value': ExternalObject.routingFunction,
      '*anything': 'anything'
    };
  }

  preinitialize(options) {
    this.testpreinit = 'foo';
  }

  initialize(options) {
    this.testing = options.testing;
    this.route('implicit', 'implicit');
  }

  counter() {
    this.count++;
  }

  implicit() {
    this.count++;
  }

  search(query, page) {
    this.query = query;
    this.page = page;
  }

  charUTF() {
    this.charType = 'UTF';
  }

  charEscaped() {
    this.charType = 'escaped';
  }

  contacts() {
    this.contact = 'index';
  }

  newContact() {
    this.contact = 'new';
  }

  loadContact() {
    this.contact = 'load';
  }

  optionalItem(arg) {
    this.arg = arg !== undefined ? arg : null;
  }

  splat(args) {
    this.args = args;
  }

  github(repo, from, to) {
    this.repo = repo;
    this.from = from;
    this.to = to;
  }

  complex(first, part, rest) {
    this.first = first;
    this.part = part;
    this.rest = rest;
  }

  query(entity, args) {
    this.entity = entity;
    this.queryArgs = args;
  }

  anything(whatever) {
    this.anything = whatever;
  }

  namedOptional(_z) {
    this.z = _z;
  }

  decode(named, path) {
    this.named = named;
    this.path = path;
  }

  routeEvent(arg) {}
}

describe('Schmackbone.Router', () => {
  var originalLocation;

  beforeEach(() => {
    originalLocation = window.location;

    delete window.location;

    window.location = {
      href: '',
      pathname: '',
      replace(href) {
        var url = new URL(href);

        this.pathname = url.pathname;
        this.origin = url.origin;
        this.href = url.href;
        this.search = url.search;
      }
    };

    history.location = window.location;
    router = new _Router({testing: 101});
    history.interval = 9;
    history.start();
    lastRoute = null;
    lastArgs = [];
    history.on('route', onRoute);
  });

  afterEach(() => {
    window.location = originalLocation;
    history.stop();
    history.off('route', onRoute);
  });

  test('initialize', () => {
    expect(router.testing).toEqual(101);
  });

  test('preinitialize', () => {
    expect(router.testpreinit).toEqual('foo');
  });

  test('routes (simple)', () => {
    window.location.replace('http://example.com/search/news');
    history.checkUrl();
    expect(router.query).toEqual('news');
    expect(router.page).toBe(null);
    expect(lastRoute).toEqual('search');
    expect(lastArgs[0]).toEqual('news');
  });

  /*
  test('routes (simple, but unicode)', () => {
    assert.expect(4);
    location.replace('http://example.com#search/тест');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'тест');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
    assert.equal(lastArgs[0], 'тест');
  });

  test('routes (two part)', () => {
    assert.expect(2);
    location.replace('http://example.com#search/nyc/p10');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'nyc');
    assert.equal(router.page, '10');
  });

  test('routes via navigate', () => {
    assert.expect(2);
    Schmackbone.history.navigate('search/manhattan/p20', {trigger: true});
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  test('routes via navigate with params', () => {
    assert.expect(1);
    Schmackbone.history.navigate('query/test?a=b', {trigger: true});
    assert.equal(router.queryArgs, 'a=b');
  });

  test('routes via navigate for backwards-compatibility', () => {
    assert.expect(2);
    Schmackbone.history.navigate('search/manhattan/p20', true);
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  test('reports matched route via nagivate', () => {
    assert.expect(1);
    assert.ok(Schmackbone.history.navigate('search/manhattan/p20', true));
  });

  test('route precedence via navigate', () => {
    assert.expect(6);

    // Check both 0.9.x and backwards-compatibility options
    _.each([{trigger: true}, true], function(options) {
      Schmackbone.history.navigate('contacts', options);
      assert.equal(router.contact, 'index');
      Schmackbone.history.navigate('contacts/new', options);
      assert.equal(router.contact, 'new');
      Schmackbone.history.navigate('contacts/foo', options);
      assert.equal(router.contact, 'load');
    });
  });

  test('loadUrl is not called for identical routes.', () => {
    assert.expect(0);
    Schmackbone.history.loadUrl = function() { assert.ok(false); };
    location.replace('http://example.com#route');
    Schmackbone.history.navigate('route');
    Schmackbone.history.navigate('/route');
    Schmackbone.history.navigate('/route');
  });

  test('use implicit callback if none provided', () => {
    assert.expect(1);
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    assert.equal(router.count, 1);
  });

  test('routes via navigate with {replace: true}', () => {
    assert.expect(1);
    location.replace('http://example.com#start_here');
    Schmackbone.history.checkUrl();
    location.replace = function(href) {
      assert.strictEqual(href, new Location('http://example.com#end_here').href);
    };
    Schmackbone.history.navigate('end_here', {replace: true});
  });

  test('routes (splats)', () => {
    assert.expect(1);
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Schmackbone.history.checkUrl();
    assert.equal(router.args, 'long-list/of/splatted_99args');
  });

  test('routes (github)', () => {
    assert.expect(3);
    location.replace('http://example.com#backbone/compare/1.0...braddunbar:with/slash');
    Schmackbone.history.checkUrl();
    assert.equal(router.repo, 'backbone');
    assert.equal(router.from, '1.0');
    assert.equal(router.to, 'braddunbar:with/slash');
  });

  test('routes (optional)', () => {
    assert.expect(2);
    location.replace('http://example.com#optional');
    Schmackbone.history.checkUrl();
    assert.ok(!router.arg);
    location.replace('http://example.com#optional/thing');
    Schmackbone.history.checkUrl();
    assert.equal(router.arg, 'thing');
  });

  test('routes (complex)', () => {
    assert.expect(3);
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Schmackbone.history.checkUrl();
    assert.equal(router.first, 'one/two/three');
    assert.equal(router.part, 'part');
    assert.equal(router.rest, 'four/five/six/seven');
  });

  test('routes (query)', () => {
    assert.expect(5);
    location.replace('http://example.com#query/mandel?a=b&c=d');
    Schmackbone.history.checkUrl();
    assert.equal(router.entity, 'mandel');
    assert.equal(router.queryArgs, 'a=b&c=d');
    assert.equal(lastRoute, 'query');
    assert.equal(lastArgs[0], 'mandel');
    assert.equal(lastArgs[1], 'a=b&c=d');
  });

  test('routes (anything)', () => {
    assert.expect(1);
    location.replace('http://example.com#doesnt-match-a-route');
    Schmackbone.history.checkUrl();
    assert.equal(router.anything, 'doesnt-match-a-route');
  });

  test('routes (function)', () => {
    assert.expect(3);
    router.on('route', function(name) {
      assert.ok(name === '');
    });
    assert.equal(ExternalObject.value, 'unset');
    location.replace('http://example.com#function/set');
    Schmackbone.history.checkUrl();
    assert.equal(ExternalObject.value, 'set');
  });

  test('Decode named parameters, not splats.', () => {
    assert.expect(2);
    location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.named, 'a/b');
    assert.strictEqual(router.path, 'c/d/e');
  });

  test('fires event when router doesn\'t have callback on it', () => {
    assert.expect(1);
    router.on('route:noCallback', function() { assert.ok(true); });
    location.replace('http://example.com#noCallback');
    Schmackbone.history.checkUrl();
  });

  test('No events are triggered if #execute returns false.', () => {
    assert.expect(1);
    var MyRouter = Schmackbone.Router.extend({

      routes: {
        foo: function() {
          assert.ok(true);
        }
      },

      execute: function(callback, args) {
        callback.apply(this, args);
        return false;
      }

    });

    var myRouter = new MyRouter;

    myRouter.on('route route:foo', function() {
      assert.ok(false);
    });

    Schmackbone.history.on('route', function() {
      assert.ok(false);
    });

    location.replace('http://example.com#foo');
    Schmackbone.history.checkUrl();
  });

  test('#933, #908 - leading slash', () => {
    assert.expect(2);
    location.replace('http://example.com/root/foo');

    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({root: '/root', hashChange: false, silent: true});
    assert.strictEqual(Schmackbone.history.getFragment(), 'foo');

    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({root: '/root/', hashChange: false, silent: true});
    assert.strictEqual(Schmackbone.history.getFragment(), 'foo');
  });

  test('#967 - Route callback gets passed encoded values.', () => {
    assert.expect(3);
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Schmackbone.history.navigate(route, {trigger: true});
    assert.strictEqual(router.first, 'has/slash');
    assert.strictEqual(router.part, 'has#hash');
    assert.strictEqual(router.rest, 'has space');
  });

  test('correctly handles URLs with % (#868)', () => {
    assert.expect(3);
    location.replace('http://example.com#search/fat%3A1.5%25');
    Schmackbone.history.checkUrl();
    location.replace('http://example.com#search/fat');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'fat');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
  });

  test('#2666 - Hashes with UTF8 in them.', () => {
    assert.expect(2);
    Schmackbone.history.navigate('charñ', {trigger: true});
    assert.equal(router.charType, 'UTF');
    Schmackbone.history.navigate('char%C3%B1', {trigger: true});
    assert.equal(router.charType, 'UTF');
  });

  test('#1185 - Use pathname when hashChange is not wanted.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/path/name#hash');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({hashChange: false});
    var fragment = Schmackbone.history.getFragment();
    assert.strictEqual(fragment, location.pathname.replace(/^\//, ''));
  });

  test('#1206 - Strip leading slash before location.assign.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root/');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({hashChange: false, root: '/root/'});
    location.assign = function(pathname) {
      assert.strictEqual(pathname, '/root/fragment');
    };
    Schmackbone.history.navigate('/fragment');
  });

  test('#1387 - Root fragment without trailing slash.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({hashChange: false, root: '/root/', silent: true});
    assert.strictEqual(Schmackbone.history.getFragment(), '');
  });

  test('#1366 - History does not prepend root to fragment.', () => {
    assert.expect(2);
    Schmackbone.history.stop();
    location.replace('http://example.com/root/');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root/x');
        }
      }
    });
    Schmackbone.history.start({
      root: '/root/',
      pushState: true,
      hashChange: false
    });
    Schmackbone.history.navigate('x');
    assert.strictEqual(Schmackbone.history.fragment, 'x');
  });

  test('Normalize root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root/fragment');
        }
      }
    });
    Schmackbone.history.start({
      pushState: true,
      root: '/root',
      hashChange: false
    });
    Schmackbone.history.navigate('fragment');
  });

  test('Normalize root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root#fragment');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/fragment');
        }
      }
    });
    Schmackbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test('Normalize root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.loadUrl = function() { assert.ok(true); };
    Schmackbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test('Normalize root - leading slash.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Schmackbone.history.start({root: 'root'});
    assert.strictEqual(Schmackbone.history.root, '/root/');
  });

  test('Transition from hashChange to pushState.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root#x/y');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/x/y');
        }
      }
    });
    Schmackbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test('#1619: Router: Normalize empty root', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Schmackbone.history.start({root: ''});
    assert.strictEqual(Schmackbone.history.root, '/');
  });

  test('#1619: Router: nagivate with empty root', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/fragment');
        }
      }
    });
    Schmackbone.history.start({
      pushState: true,
      root: '',
      hashChange: false
    });
    Schmackbone.history.navigate('fragment');
  });

  test('Transition from pushState to hashChange.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root/x/y?a=b');
    location.replace = function(url) {
      assert.strictEqual(url, '/root#x/y?a=b');
    };
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: null,
        replaceState: null
      }
    });
    Schmackbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test('#1695 - hashChange to pushState with search.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root#x/y?a=b');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/x/y?a=b');
        }
      }
    });
    Schmackbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test('#1746 - Router allows empty route.', () => {
    assert.expect(1);
    var MyRouter = Schmackbone.Router.extend({
      routes: {'': 'empty'},
      empty: function() {},
      route: function(route) {
        assert.strictEqual(route, '');
      }
    });
    new MyRouter;
  });

  test('#1794 - Trailing space in fragments.', () => {
    assert.expect(1);
    var history = new Schmackbone.History;
    assert.strictEqual(history.getFragment('fragment   '), 'fragment');
  });

  test('#1820 - Leading slash and trailing space.', () => {
    assert.expect(1);
    var history = new Schmackbone.History;
    assert.strictEqual(history.getFragment('/fragment '), 'fragment');
  });

  test('#1980 - Optional parameters.', () => {
    assert.expect(2);
    location.replace('http://example.com#named/optional/y');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.z, undefined);
    location.replace('http://example.com#named/optional/y123');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.z, '123');
  });

  test('#2062 - Trigger "route" event on router instance.', () => {
    assert.expect(2);
    router.on('route', function(name, args) {
      assert.strictEqual(name, 'routeEvent');
      assert.deepEqual(args, ['x', null]);
    });
    location.replace('http://example.com#route-event/x');
    Schmackbone.history.checkUrl();
  });

  test('#2255 - Extend routes by making routes a function.', () => {
    assert.expect(1);
    var RouterBase = Schmackbone.Router.extend({
      routes: function() {
        return {
          home: 'root',
          index: 'index.html'
        };
      }
    });

    var RouterExtended = RouterBase.extend({
      routes: function() {
        var _super = RouterExtended.__super__.routes;
        return _.extend(_super(), {show: 'show', search: 'search'});
      }
    });

    var myRouter = new RouterExtended();
    expect({
      home: 'root',
      index: 'index.html',
      show: 'show',
      search: 'search'
    }).toEqual(myRouter.routes);
  });

  test('#2538 - hashChange to pushState only if both requested.', () => {
    assert.expect(0);
    Schmackbone.history.stop();
    location.replace('http://example.com/root?a=b#x/y');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() { assert.ok(false); }
      }
    });
    Schmackbone.history.start({
      root: 'root',
      pushState: true,
      hashChange: false
    });
  });

  test('No hash fallback.', () => {
    assert.expect(0);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });

    var MyRouter = Schmackbone.Router.extend({
      routes: {
        hash: function() { assert.ok(false); }
      }
    });
    var myRouter = new MyRouter;

    location.replace('http://example.com/');
    Schmackbone.history.start({
      pushState: true,
      hashChange: false
    });
    location.replace('http://example.com/nomatch#hash');
    Schmackbone.history.checkUrl();
  });

  test('#2656 - No trailing slash on root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Schmackbone.history.start({pushState: true, hashChange: false, root: 'root'});
    Schmackbone.history.navigate('');
  });

  test('#2656 - No trailing slash on root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/');
        }
      }
    });
    location.replace('http://example.com/path');
    Schmackbone.history.start({pushState: true, hashChange: false});
    Schmackbone.history.navigate('');
  });

  test('#2656 - No trailing slash on root.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root?x=1');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Schmackbone.history.start({pushState: true, hashChange: false, root: 'root'});
    Schmackbone.history.navigate('?x=1');
  });

  test('#2765 - Fragment matching sans query/hash.', () => {
    assert.expect(2);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/path?query#hash');
        }
      }
    });

    var MyRouter = Schmackbone.Router.extend({
      routes: {
        path: function() { assert.ok(true); }
      }
    });
    var myRouter = new MyRouter;

    location.replace('http://example.com/');
    Schmackbone.history.start({pushState: true, hashChange: false});
    Schmackbone.history.navigate('path?query#hash', true);
  });

  test('Do not decode the search params.', () => {
    assert.expect(1);
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        path: function(params) {
          assert.strictEqual(params, 'x=y%3Fz');
        }
      }
    });
    var myRouter = new MyRouter;
    Schmackbone.history.navigate('path?x=y%3Fz', true);
  });

  test('Navigate to a hash url.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({pushState: true});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        path: function(params) {
          assert.strictEqual(params, 'x=y');
        }
      }
    });
    var myRouter = new MyRouter;
    location.replace('http://example.com/path?x=y#hash');
    Schmackbone.history.checkUrl();
  });

  test('#navigate to a hash url.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({pushState: true});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        path: function(params) {
          assert.strictEqual(params, 'x=y');
        }
      }
    });
    var myRouter = new MyRouter;
    Schmackbone.history.navigate('path?x=y#hash', true);
  });

  test('unicode pathname', () => {
    assert.expect(1);
    location.replace('http://example.com/myyjä');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        myyjä: function() {
          assert.ok(true);
        }
      }
    });
    new MyRouter;
    Schmackbone.history.start({pushState: true});
  });

  test('unicode pathname with % in a parameter', () => {
    assert.expect(1);
    location.replace('http://example.com/myyjä/foo%20%25%3F%2f%40%25%20bar');
    location.pathname = '/myyj%C3%A4/foo%20%25%3F%2f%40%25%20bar';
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        'myyjä/:query': function(query) {
          assert.strictEqual(query, 'foo %?/@% bar');
        }
      }
    });
    new MyRouter;
    Schmackbone.history.start({pushState: true});
  });

  test('newline in route', () => {
    assert.expect(1);
    location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        'stuff\nnonsense': function() {
          assert.ok(true);
        }
      }
    });
    new MyRouter;
    Schmackbone.history.start({pushState: true});
  });

  test('Router#execute receives callback, args, name.', () => {
    assert.expect(3);
    location.replace('http://example.com#foo/123/bar?x=y');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {'foo/:id/bar': 'foo'},
      foo: function() {},
      execute: function(callback, args, name) {
        assert.strictEqual(callback, this.foo);
        assert.deepEqual(args, ['123', 'x=y']);
        assert.strictEqual(name, 'foo');
      }
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start();
  });

  test('pushState to hashChange with only search params.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com?a=b');
    location.replace = function(url) {
      assert.strictEqual(url, '/#?a=b');
    };
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: null
    });
    Schmackbone.history.start({pushState: true});
  });

  test('#3123 - History#navigate decodes before comparison.', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/shop/search?keyword=short%20dress');
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: function() { assert.ok(false); },
        replaceState: function() { assert.ok(false); }
      }
    });
    Schmackbone.history.start({pushState: true});
    Schmackbone.history.navigate('shop/search?keyword=short%20dress', true);
    assert.strictEqual(Schmackbone.history.fragment, 'shop/search?keyword=short dress');
  });

  test('#3175 - Urls in the params', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace(
      'http://example.com#login' +
        '?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var myRouter = new Schmackbone.Router;
    myRouter.route('login', function(params) {
      expect(params).toEqual(
        'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db'
      );
    });
    Schmackbone.history.start();
  });

  test('#3358 - pushState to hashChange transition with search params', () => {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root?foo=bar');
    location.replace = function(url) {
      assert.strictEqual(url, '/root#?foo=bar');
    };
    Schmackbone.history = _.extend(new Schmackbone.History, {
      location: location,
      history: {
        pushState: undefined,
        replaceState: undefined
      }
    });
    Schmackbone.history.start({root: '/root', pushState: true});
  });

  test('Paths that don\'t match the root should not match no root', () => {
    assert.expect(0);
    location.replace('http://example.com/foo');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        foo: function() {
          assert.ok(false, 'should not match unless root matches');
        }
      }
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start({root: 'root', pushState: true});
  });

  test('Paths that don\'t match the root should not match roots of the same length', () => {
    assert.expect(0);
    location.replace('http://example.com/xxxx/foo');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {
        foo: function() {
          assert.ok(false, 'should not match unless root matches');
        }
      }
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start({root: 'root', pushState: true});
  });

  test('roots with regex characters', () => {
    assert.expect(1);
    location.replace('http://example.com/x+y.z/foo');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {foo: function() { assert.ok(true); }}
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start({root: 'x+y.z', pushState: true});
  });

  test('roots with unicode characters', () => {
    assert.expect(1);
    location.replace('http://example.com/®ooτ/foo');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {foo: function() { assert.ok(true); }}
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start({root: '®ooτ', pushState: true});
  });

  test('roots without slash', () => {
    assert.expect(1);
    location.replace('http://example.com/®ooτ');
    Schmackbone.history.stop();
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var MyRouter = Schmackbone.Router.extend({
      routes: {'': function() { assert.ok(true); }}
    });
    var myRouter = new MyRouter;
    Schmackbone.history.start({root: '®ooτ', pushState: true});
  });

  test('#4025 - navigate updates URL hash as is', () => {
    assert.expect(1);
    var route = 'search/has%20space';
    Schmackbone.history.navigate(route);
    assert.strictEqual(location.hash, '#' + route);
  });
  */
});
