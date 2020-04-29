(function(QUnit) {

  var router = null;
  var location = null;
  var lastRoute = null;
  var lastArgs = [];

  var onRoute = function(routerParam, route, args) {
    lastRoute = route;
    lastArgs = args;
  };

  var Location = function(href) {
    this.replace(href);
  };

  _.extend(Location.prototype, {

    parser: document.createElement('a'),

    replace: function(href) {
      this.parser.href = href;
      _.extend(this, _.pick(this.parser,
        'href',
        'hash',
        'host',
        'search',
        'fragment',
        'pathname',
        'protocol'
      ));

      // In IE, anchor.pathname does not contain a leading slash though
      // window.location.pathname does.
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    },

    toString: function() {
      return this.href;
    }

  });

  QUnit.module('Schmackbone.Router', {

    beforeEach: function() {
      location = new Location('http://example.com');
      Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
      router = new Router({testing: 101});
      Schmackbone.history.interval = 9;
      Schmackbone.history.start({pushState: false});
      lastRoute = null;
      lastArgs = [];
      Schmackbone.history.on('route', onRoute);
    },

    afterEach: function() {
      Schmackbone.history.stop();
      Schmackbone.history.off('route', onRoute);
    }

  });

  var ExternalObject = {
    value: 'unset',

    routingFunction: function(value) {
      this.value = value;
    }
  };
  ExternalObject.routingFunction = _.bind(ExternalObject.routingFunction, ExternalObject);

  var Router = Schmackbone.Router.extend({

    count: 0,

    routes: {
      'noCallback': 'noCallback',
      'counter': 'counter',
      'search/:query': 'search',
      'search/:query/p:page': 'search',
      'charñ': 'charUTF',
      'char%C3%B1': 'charEscaped',
      'contacts': 'contacts',
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
    },

    preinitialize: function(options) {
      this.testpreinit = 'foo';
    },

    initialize: function(options) {
      this.testing = options.testing;
      this.route('implicit', 'implicit');
    },

    counter: function() {
      this.count++;
    },

    implicit: function() {
      this.count++;
    },

    search: function(query, page) {
      this.query = query;
      this.page = page;
    },

    charUTF: function() {
      this.charType = 'UTF';
    },

    charEscaped: function() {
      this.charType = 'escaped';
    },

    contacts: function() {
      this.contact = 'index';
    },

    newContact: function() {
      this.contact = 'new';
    },

    loadContact: function() {
      this.contact = 'load';
    },

    optionalItem: function(arg) {
      this.arg = arg !== void 0 ? arg : null;
    },

    splat: function(args) {
      this.args = args;
    },

    github: function(repo, from, to) {
      this.repo = repo;
      this.from = from;
      this.to = to;
    },

    complex: function(first, part, rest) {
      this.first = first;
      this.part = part;
      this.rest = rest;
    },

    query: function(entity, args) {
      this.entity    = entity;
      this.queryArgs = args;
    },

    anything: function(whatever) {
      this.anything = whatever;
    },

    namedOptional: function(z) {
      this.z = z;
    },

    decode: function(named, path) {
      this.named = named;
      this.path = path;
    },

    routeEvent: function(arg) {
    }

  });

  QUnit.test('initialize', function(assert) {
    assert.expect(1);
    assert.equal(router.testing, 101);
  });

  QUnit.test('preinitialize', function(assert) {
    assert.expect(1);
    assert.equal(router.testpreinit, 'foo');
  });

  QUnit.test('routes (simple)', function(assert) {
    assert.expect(4);
    location.replace('http://example.com#search/news');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'news');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
    assert.equal(lastArgs[0], 'news');
  });

  QUnit.test('routes (simple, but unicode)', function(assert) {
    assert.expect(4);
    location.replace('http://example.com#search/тест');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'тест');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
    assert.equal(lastArgs[0], 'тест');
  });

  QUnit.test('routes (two part)', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#search/nyc/p10');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'nyc');
    assert.equal(router.page, '10');
  });

  QUnit.test('routes via navigate', function(assert) {
    assert.expect(2);
    Schmackbone.history.navigate('search/manhattan/p20', {trigger: true});
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  QUnit.test('routes via navigate with params', function(assert) {
    assert.expect(1);
    Schmackbone.history.navigate('query/test?a=b', {trigger: true});
    assert.equal(router.queryArgs, 'a=b');
  });

  QUnit.test('routes via navigate for backwards-compatibility', function(assert) {
    assert.expect(2);
    Schmackbone.history.navigate('search/manhattan/p20', true);
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  QUnit.test('reports matched route via nagivate', function(assert) {
    assert.expect(1);
    assert.ok(Schmackbone.history.navigate('search/manhattan/p20', true));
  });

  QUnit.test('route precedence via navigate', function(assert) {
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

  QUnit.test('loadUrl is not called for identical routes.', function(assert) {
    assert.expect(0);
    Schmackbone.history.loadUrl = function() { assert.ok(false); };
    location.replace('http://example.com#route');
    Schmackbone.history.navigate('route');
    Schmackbone.history.navigate('/route');
    Schmackbone.history.navigate('/route');
  });

  QUnit.test('use implicit callback if none provided', function(assert) {
    assert.expect(1);
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    assert.equal(router.count, 1);
  });

  QUnit.test('routes via navigate with {replace: true}', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#start_here');
    Schmackbone.history.checkUrl();
    location.replace = function(href) {
      assert.strictEqual(href, new Location('http://example.com#end_here').href);
    };
    Schmackbone.history.navigate('end_here', {replace: true});
  });

  QUnit.test('routes (splats)', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Schmackbone.history.checkUrl();
    assert.equal(router.args, 'long-list/of/splatted_99args');
  });

  QUnit.test('routes (github)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#backbone/compare/1.0...braddunbar:with/slash');
    Schmackbone.history.checkUrl();
    assert.equal(router.repo, 'backbone');
    assert.equal(router.from, '1.0');
    assert.equal(router.to, 'braddunbar:with/slash');
  });

  QUnit.test('routes (optional)', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#optional');
    Schmackbone.history.checkUrl();
    assert.ok(!router.arg);
    location.replace('http://example.com#optional/thing');
    Schmackbone.history.checkUrl();
    assert.equal(router.arg, 'thing');
  });

  QUnit.test('routes (complex)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Schmackbone.history.checkUrl();
    assert.equal(router.first, 'one/two/three');
    assert.equal(router.part, 'part');
    assert.equal(router.rest, 'four/five/six/seven');
  });

  QUnit.test('routes (query)', function(assert) {
    assert.expect(5);
    location.replace('http://example.com#query/mandel?a=b&c=d');
    Schmackbone.history.checkUrl();
    assert.equal(router.entity, 'mandel');
    assert.equal(router.queryArgs, 'a=b&c=d');
    assert.equal(lastRoute, 'query');
    assert.equal(lastArgs[0], 'mandel');
    assert.equal(lastArgs[1], 'a=b&c=d');
  });

  QUnit.test('routes (anything)', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#doesnt-match-a-route');
    Schmackbone.history.checkUrl();
    assert.equal(router.anything, 'doesnt-match-a-route');
  });

  QUnit.test('routes (function)', function(assert) {
    assert.expect(3);
    router.on('route', function(name) {
      assert.ok(name === '');
    });
    assert.equal(ExternalObject.value, 'unset');
    location.replace('http://example.com#function/set');
    Schmackbone.history.checkUrl();
    assert.equal(ExternalObject.value, 'set');
  });

  QUnit.test('Decode named parameters, not splats.', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.named, 'a/b');
    assert.strictEqual(router.path, 'c/d/e');
  });

  QUnit.test('fires event when router doesn\'t have callback on it', function(assert) {
    assert.expect(1);
    router.on('route:noCallback', function() { assert.ok(true); });
    location.replace('http://example.com#noCallback');
    Schmackbone.history.checkUrl();
  });

  QUnit.test('No events are triggered if #execute returns false.', function(assert) {
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

  QUnit.test('#933, #908 - leading slash', function(assert) {
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

  QUnit.test('#967 - Route callback gets passed encoded values.', function(assert) {
    assert.expect(3);
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Schmackbone.history.navigate(route, {trigger: true});
    assert.strictEqual(router.first, 'has/slash');
    assert.strictEqual(router.part, 'has#hash');
    assert.strictEqual(router.rest, 'has space');
  });

  QUnit.test('correctly handles URLs with % (#868)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#search/fat%3A1.5%25');
    Schmackbone.history.checkUrl();
    location.replace('http://example.com#search/fat');
    Schmackbone.history.checkUrl();
    assert.equal(router.query, 'fat');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
  });

  QUnit.test('#2666 - Hashes with UTF8 in them.', function(assert) {
    assert.expect(2);
    Schmackbone.history.navigate('charñ', {trigger: true});
    assert.equal(router.charType, 'UTF');
    Schmackbone.history.navigate('char%C3%B1', {trigger: true});
    assert.equal(router.charType, 'UTF');
  });

  QUnit.test('#1185 - Use pathname when hashChange is not wanted.', function(assert) {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/path/name#hash');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({hashChange: false});
    var fragment = Schmackbone.history.getFragment();
    assert.strictEqual(fragment, location.pathname.replace(/^\//, ''));
  });

  QUnit.test('#1206 - Strip leading slash before location.assign.', function(assert) {
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

  QUnit.test('#1387 - Root fragment without trailing slash.', function(assert) {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com/root');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    Schmackbone.history.start({hashChange: false, root: '/root/', silent: true});
    assert.strictEqual(Schmackbone.history.getFragment(), '');
  });

  QUnit.test('#1366 - History does not prepend root to fragment.', function(assert) {
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

  QUnit.test('Normalize root.', function(assert) {
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

  QUnit.test('Normalize root.', function(assert) {
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

  QUnit.test('Normalize root.', function(assert) {
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

  QUnit.test('Normalize root - leading slash.', function(assert) {
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

  QUnit.test('Transition from hashChange to pushState.', function(assert) {
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

  QUnit.test('#1619: Router: Normalize empty root', function(assert) {
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

  QUnit.test('#1619: Router: nagivate with empty root', function(assert) {
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

  QUnit.test('Transition from pushState to hashChange.', function(assert) {
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

  QUnit.test('#1695 - hashChange to pushState with search.', function(assert) {
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

  QUnit.test('#1746 - Router allows empty route.', function(assert) {
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

  QUnit.test('#1794 - Trailing space in fragments.', function(assert) {
    assert.expect(1);
    var history = new Schmackbone.History;
    assert.strictEqual(history.getFragment('fragment   '), 'fragment');
  });

  QUnit.test('#1820 - Leading slash and trailing space.', function(assert) {
    assert.expect(1);
    var history = new Schmackbone.History;
    assert.strictEqual(history.getFragment('/fragment '), 'fragment');
  });

  QUnit.test('#1980 - Optional parameters.', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#named/optional/y');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.z, undefined);
    location.replace('http://example.com#named/optional/y123');
    Schmackbone.history.checkUrl();
    assert.strictEqual(router.z, '123');
  });

  QUnit.test('#2062 - Trigger "route" event on router instance.', function(assert) {
    assert.expect(2);
    router.on('route', function(name, args) {
      assert.strictEqual(name, 'routeEvent');
      assert.deepEqual(args, ['x', null]);
    });
    location.replace('http://example.com#route-event/x');
    Schmackbone.history.checkUrl();
  });

  QUnit.test('#2255 - Extend routes by making routes a function.', function(assert) {
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
    assert.deepEqual({home: 'root', index: 'index.html', show: 'show', search: 'search'}, myRouter.routes);
  });

  QUnit.test('#2538 - hashChange to pushState only if both requested.', function(assert) {
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

  QUnit.test('No hash fallback.', function(assert) {
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

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
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

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
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

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
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

  QUnit.test('#2765 - Fragment matching sans query/hash.', function(assert) {
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

  QUnit.test('Do not decode the search params.', function(assert) {
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

  QUnit.test('Navigate to a hash url.', function(assert) {
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

  QUnit.test('#navigate to a hash url.', function(assert) {
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

  QUnit.test('unicode pathname', function(assert) {
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

  QUnit.test('unicode pathname with % in a parameter', function(assert) {
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

  QUnit.test('newline in route', function(assert) {
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

  QUnit.test('Router#execute receives callback, args, name.', function(assert) {
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

  QUnit.test('pushState to hashChange with only search params.', function(assert) {
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

  QUnit.test('#3123 - History#navigate decodes before comparison.', function(assert) {
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

  QUnit.test('#3175 - Urls in the params', function(assert) {
    assert.expect(1);
    Schmackbone.history.stop();
    location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
    Schmackbone.history = _.extend(new Schmackbone.History, {location: location});
    var myRouter = new Schmackbone.Router;
    myRouter.route('login', function(params) {
      assert.strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
    });
    Schmackbone.history.start();
  });

  QUnit.test('#3358 - pushState to hashChange transition with search params', function(assert) {
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

  QUnit.test('Paths that don\'t match the root should not match no root', function(assert) {
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

  QUnit.test('Paths that don\'t match the root should not match roots of the same length', function(assert) {
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

  QUnit.test('roots with regex characters', function(assert) {
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

  QUnit.test('roots with unicode characters', function(assert) {
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

  QUnit.test('roots without slash', function(assert) {
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

  QUnit.test('#4025 - navigate updates URL hash as is', function(assert) {
    assert.expect(1);
    var route = 'search/has%20space';
    Schmackbone.history.navigate(route);
    assert.strictEqual(location.hash, '#' + route);
  });

})(QUnit);
