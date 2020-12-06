import History, {history} from '../lib/history';
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
    history.handlers = [];

    router = new _Router({testing: 101});
    history.interval = 9;
    history.start({root: '/'});
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

  test('routes (simple, but unicode)', () => {
    location.replace('http://example.com/search/тест');
    history.checkUrl();
    expect(router.query).toEqual('тест');
    expect(router.page).toBe(null);
    expect(lastRoute).toEqual('search');
    expect(lastArgs[0]).toEqual('тест');
  });

  test('routes (two part)', () => {
    location.replace('http://example.com/search/nyc/p10');
    history.checkUrl();
    expect(router.query).toEqual('nyc');
    expect(router.page).toEqual('10');
  });

  test('routes via navigate', () => {
    history.navigate('search/manhattan/p20', {trigger: true});
    expect(router.query).toEqual('manhattan');
    expect(router.page).toEqual('20');
  });

  test('routes via navigate with params', () => {
    history.navigate('query/test?a=b', {trigger: true});
    expect(router.queryArgs).toEqual('a=b');
  });

  test('route precedence via navigate', () => {
    history.navigate('contacts', {trigger: true});
    expect(router.contact).toEqual('index');
    history.navigate('contacts/new', {trigger: true});
    expect(router.contact).toEqual('new');
    history.navigate('contacts/foo', {trigger: true});
    expect(router.contact).toEqual('load');
  });

  test('loadUrl is not called for identical routes.', () => {
    jest.spyOn(history, 'loadUrl').mockReturnValue();

    location.replace('http://example.com/route');
    history.navigate('route');
    history.navigate('/route');
    history.navigate('/route');

    expect(history.loadUrl).not.toHaveBeenCalled();

    history.loadUrl.mockRestore();
  });

  test('use implicit callback if none provided', () => {
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    expect(router.count).toEqual(1);
  });

  test('routes via navigate with {replace: true}', () => {
    location.replace('http://example.com/start_here');
    history.checkUrl();

    jest.spyOn(history.history, 'replaceState');
    history.navigate('end_here', {replace: true});
    expect(history.history.replaceState.mock.calls[0][2]).toEqual('/end_here');
  });

  test('routes (splats)', () => {
    location.replace('http://example.com/splat/long-list/of/splatted_99args/end');
    history.checkUrl();
    expect(router.args).toEqual('long-list/of/splatted_99args');
  });

  test('routes (github)', () => {
    location.replace('http://example.com/backbone/compare/1.0...braddunbar:with/slash');
    history.checkUrl();
    expect(router.repo).toEqual('backbone');
    expect(router.from).toEqual('1.0');
    expect(router.to).toEqual('braddunbar:with/slash');
  });

  test('routes (optional)', () => {
    location.replace('http://example.com/optional');
    history.checkUrl();
    expect(!router.arg).toBe(true);
    location.replace('http://example.com/optional/thing');
    history.checkUrl();
    expect(router.arg).toEqual('thing');
  });

  test('routes (complex)', () => {
    location.replace('http://example.com/one/two/three/complex-part/four/five/six/seven');
    history.checkUrl();
    expect(router.first).toEqual('one/two/three');
    expect(router.part).toEqual('part');
    expect(router.rest).toEqual('four/five/six/seven');
  });

  test('routes (query)', () => {
    location.replace('http://example.com/query/mandel?a=b&c=d');
    history.checkUrl();
    expect(router.entity).toEqual('mandel');
    expect(router.queryArgs).toEqual('a=b&c=d');
    expect(lastRoute).toEqual('query');
    expect(lastArgs[0]).toEqual('mandel');
    expect(lastArgs[1]).toEqual('a=b&c=d');
  });

  test('routes (anything)', () => {
    location.replace('http://example.com/doesnt-match-a-route');
    history.checkUrl();
    expect(router.anything).toEqual('doesnt-match-a-route');
  });

  test('routes (function)', () => {
    router.on('route', (name) => {
      expect(name).toEqual('');
    });
    expect(ExternalObject.value).toEqual('unset');
    location.replace('http://example.com/function/set');
    history.checkUrl();
    expect(ExternalObject.value).toEqual('set');
  });

  test('Decode named parameters, not splats.', () => {
    location.replace('http://example.com/decode/a%2Fb/c%2Fd/e');
    history.checkUrl();
    expect(router.named).toEqual('a/b');
    expect(router.path).toEqual('c/d/e');
  });

  test('fires event when router doesn\'t have callback on it', () => {
    var routeSpy = jest.fn();

    router.on('route:noCallback', routeSpy);
    location.replace('http://example.com/noCallback');
    history.checkUrl();

    expect(routeSpy).toHaveBeenCalled();
  });

  test('No events are triggered if #execute returns false.', () => {
    var myRouter,
        routeSpy = jest.fn(),
        fooRouteSpy = jest.fn(),
        defSpy = jest.fn();

    class MyRouter extends Router {
      routes() {
        return {foo: routeSpy};
      }

      execute(callback, args) {
        callback.apply(this, args);

        return false;
      }
    }

    myRouter = new MyRouter;

    myRouter.on('route route:foo', fooRouteSpy);

    history.on('route', defSpy);
    location.replace('http://example.com/foo');
    history.checkUrl();

    expect(routeSpy).toHaveBeenCalled();
    expect(fooRouteSpy).not.toHaveBeenCalled();
    expect(defSpy).not.toHaveBeenCalled();
  });

  test('#933, #908 - leading slash', () => {
    location.replace('http://example.com/root/foo');

    history.stop();
    history.start({root: '/root', silent: true});
    expect(history.getFragment()).toEqual('foo');

    history.stop();
    history.start({root: '/root/', silent: true});
    expect(history.getFragment()).toEqual('foo');
  });

  test('#967 - Route callback gets passed encoded values.', () => {
    var route = 'has%2Fslash/complex-has%23hash/has%20space';

    history.navigate(route, {trigger: true});
    expect(router.first).toEqual('has/slash');
    expect(router.part).toEqual('has#hash');
    expect(router.rest).toEqual('has space');
  });

  test('correctly handles URLs with % (#868)', () => {
    location.replace('http://example.com/search/fat%3A1.5%25');
    history.checkUrl();
    location.replace('http://example.com/search/fat');
    history.checkUrl();
    expect(router.query).toEqual('fat');
    expect(router.page).toBe(null);
    expect(lastRoute).toEqual('search');
  });

  test('#2666 - Hashes with UTF8 in them.', () => {
    history.navigate('charñ', {trigger: true});
    expect(router.charType).toEqual('UTF');
    history.navigate('char%C3%B1', {trigger: true});
    expect(router.charType).toEqual('UTF');
  });

  test('#1185 - Use pathname with hash', () => {
    location.replace('http://example.com/path/name#hash');
    expect(history.getFragment()).toEqual(location.pathname.replace(/^\//, ''));
  });

  test('#1387 - Root fragment without trailing slash.', () => {
    history.stop();
    location.replace('http://example.com/root');
    history.start({root: '/root/', silent: true});
    expect(history.getFragment()).toEqual('');
  });

  test('#1366 - History does not prepend root to fragment.', () => {
    history.stop();
    location.replace('http://example.com/root/');
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/root/x');
    });
    history.start({root: '/root/'});
    history.navigate('x');
    expect(history.fragment).toEqual('x');

    history.history.pushState.mockRestore();
  });

  test('Normalize root.', () => {
    history.stop();
    location.replace('http://example.com/root');
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/root/fragment');
    });
    history.start({root: '/root'});
    history.navigate('fragment');
    history.history.pushState.mockRestore();
  });

  test('Normalize root.', () => {
    history.stop();
    location.replace('http://example.com/root#fragment');

    jest.spyOn(history.history, 'pushState').mockReturnValue();
    jest.spyOn(history.history, 'replaceState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/root/fragment');
    });
    history.start({pushState: true, root: '/root'});
    history.history.pushState.mockRestore();
    history.history.replaceState.mockRestore();
  });

  test('Normalize root.', () => {
    history.stop();
    location.replace('http://example.com/root');
    jest.spyOn(history, 'loadUrl').mockReturnValue();
    history.start({root: '/root'});
    expect(history.loadUrl).toHaveBeenCalled();

    history.loadUrl.mockRestore();
  });

  test('Normalize root - leading slash.', () => {
    history.stop();
    location.replace('http://example.com/root');
    history.start({root: 'root'});
    expect(history.root).toEqual('/root/');
  });

  test('#1619: Router: Normalize empty root', () => {
    history.stop();
    location.replace('http://example.com/');
    history.start({root: ''});
    expect(history.root).toEqual('/');
  });

  test('#1619: Router: nagivate with empty root', () => {
    history.stop();
    location.replace('http://example.com/');
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/fragment');
    });
    history.start({root: ''});
    history.navigate('fragment');
    history.history.pushState.mockRestore();
  });

  test('#1746 - Router allows empty route.', () => {
    class MyRouter extends Router {
      routes() {
        return {'': 'empty'};
      }

      empty() {}

      route(route) {
        expect(route).toEqual('');
      }
    }

    new MyRouter;
  });

  test('#1794 - Trailing space in fragments.', () => {
    var _history = new History;

    expect(_history.getFragment('fragment   ')).toEqual('fragment');
  });

  test('#1820 - Leading slash and trailing space.', () => {
    var _history = new History;

    expect(_history.getFragment('/fragment ')).toEqual('fragment');
  });

  test('#1980 - Optional parameters.', () => {
    location.replace('http://example.com/named/optional/y');
    history.checkUrl();
    expect(router.z).not.toBeDefined();
    location.replace('http://example.com/named/optional/y123');
    history.checkUrl();
    expect(router.z).toEqual('123');
  });

  test('#2062 - Trigger "route" event on router instance.', () => {
    router.on('route', (name, args) => {
      expect(name).toEqual('routeEvent');
      expect(args).toEqual(['x', null]);
    });
    location.replace('http://example.com/route-event/x');
    history.checkUrl();
  });

  test('#2255 - Extend routes by making routes a function.', () => {
    class RouterBase extends Router {
      routes() {
        return {
          home: 'root',
          index: 'index.html'
        };
      }
    }

    class RouterExtended extends RouterBase {
      routes() {
        return {...super.routes(), show: 'show', search: 'search'};
      }
    }

    expect({
      home: 'root',
      index: 'index.html',
      show: 'show',
      search: 'search'
    }).toEqual(new RouterExtended().routes);
  });

  test('#2656 - No trailing slash on root.', () => {
    history.stop();
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/root');
    });

    location.replace('http://example.com/root/path');
    history.start({root: 'root'});
    history.navigate('');
    history.history.pushState.mockRestore();
  });

  test('#2656 - No trailing slash on root.', () => {
    history.stop();
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/');
    });

    location.replace('http://example.com/path');
    history.start();
    history.navigate('');
    history.history.pushState.mockRestore();
  });

  test('#2656 - No trailing slash on root.', () => {
    history.stop();
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/root?x=1');
    });

    location.replace('http://example.com/root/path');
    history.start({root: 'root'});
    history.navigate('?x=1');
    history.history.pushState.mockRestore();
  });

  test('#2765 - Fragment matching sans query/hash.', () => {
    var pathSpy = jest.fn();

    history.stop();
    jest.spyOn(history.history, 'pushState').mockImplementation((state, title, url) => {
      expect(url).toEqual('/path?query#hash');
    });

    class MyRouter extends Router {
      routes() {
        return {path: pathSpy};
      }
    }

    new MyRouter;

    location.replace('http://example.com/');
    history.start();
    history.navigate('path?query#hash', {trigger: true});

    expect(pathSpy).toHaveBeenCalled();
    history.history.pushState.mockRestore();
  });

  test('Do not decode the search params.', () => {
    class MyRouter extends Router {
      routes() {
        return {
          path(params) {
            expect(params).toEqual('x=y%3Fz');
          }
        };
      }
    }

    new MyRouter;
    history.navigate('path?x=y%3Fz', {trigger: true});
  });

  test('Navigate to a hash url.', () => {
    class MyRouter extends Router {
      routes() {
        return {
          path(params) {
            expect(params).toEqual('x=y');
          }
        };
      }
    }

    new MyRouter;
    location.replace('http://example.com/path?x=y#hash');
    history.checkUrl();
  });

  test('#navigate to a hash url.', () => {
    class MyRouter extends Router {
      routes() {
        return {
          path(params) {
            expect(params).toEqual('x=y');
          }
        };
      }
    }
    new MyRouter;
    history.navigate('path?x=y#hash', true);
  });

  test('unicode pathname', () => {
    var pathSpy = jest.fn();

    history.stop();
    location.replace('http://example.com/myyjä');
    class MyRouter extends Router {
      routes() {
        return {myyjä: pathSpy};
      }
    }

    new MyRouter;
    history.start();
    expect(pathSpy).toHaveBeenCalled();
  });

  test('unicode pathname with % in a parameter', () => {
    location.replace('http://example.com/myyjä/foo%20%25%3F%2f%40%25%20bar');
    location.pathname = '/myyj%C3%A4/foo%20%25%3F%2f%40%25%20bar';
    history.stop();

    class MyRouter extends Router {
      routes() {
        return {
          'myyjä/:query'(query) {
            expect(query).toEqual('foo %?/@% bar');
          }
        };
      }
    }

    new MyRouter;
    history.start();
  });

  test('newline in route', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
    history.stop();
    class MyRouter extends Router {
      routes() {
        return {'stuff\nnonsense': pathSpy};
      }
    }

    new MyRouter;
    history.start();
  });

  test('Router#execute receives callback, args, name.', () => {
    location.replace('http://example.com#foo/123/bar?x=y');
    history.stop();
    class MyRouter extends Router {
      routes() {
        return {'foo/:id/bar': 'foo'};
      }

      foo() {}

      execute(callback, args, name) {
        expect(callback).toEqual(this.foo);
        expect(args).toEqual(['123', 'x=y']);
        expect(name).toEqual('foo');
      }
    }

    new MyRouter;
    history.start();
  });

  test('#3123 - History#navigate decodes before comparison.', () => {
    location.replace('http://example.com/shop/search?keyword=short%20dress');
    jest.spyOn(history, 'loadUrl').mockReturnValue();

    history.navigate('shop/search?keyword=short%20dress', {trigger: true});
    expect(history.fragment).toEqual('shop/search?keyword=short dress');
    history.loadUrl.mockRestore();
  });

  test('#3175 - Urls in the params', () => {
    var myRouter;

    history.stop();
    location.replace(
      'http://example.com#login' +
        '?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db'
    );
    myRouter = new Router;

    myRouter.route('login', (params) => {
      expect(params).toEqual(
        'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db'
      );
    });
    history.start();
  });

  test('Paths that don\'t match the root should not match no root', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/foo');
    history.stop();
    class MyRouter extends Router {
      routes() {
        return {foo: pathSpy};
      }
    }

    new MyRouter;

    history.start({root: 'root'});
    expect(pathSpy).not.toHaveBeenCalled();
  });

  test('Paths that don\'t match the root should not match roots of the same length', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/xxxx/foo');
    history.stop();
    class MyRouter extends Router {
      routes() {
        return {foo: pathSpy};
      }
    }

    new MyRouter;
    history.start({root: 'root'});
    expect(pathSpy).not.toHaveBeenCalled();
  });

  test('roots with regex characters', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/x+y.z/foo');
    history.stop();

    class MyRouter extends Router {
      routes() {
        return {foo: pathSpy};
      }
    }

    new MyRouter;
    history.start({root: 'x+y.z'});
    expect(pathSpy).toHaveBeenCalled();
  });

  test('roots with unicode characters', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/®ooτ/foo');
    history.stop();

    class MyRouter extends Router {
      routes() {
        return {foo: pathSpy};
      }
    }

    new MyRouter;
    history.start({root: '®ooτ'});
    expect(pathSpy).toHaveBeenCalled();
  });

  test('roots without slash', () => {
    var pathSpy = jest.fn();

    location.replace('http://example.com/®ooτ');
    history.stop();

    class MyRouter extends Router {
      routes() {
        return {'': pathSpy};
      }
    }

    new MyRouter;
    history.start({root: '®ooτ'});
    expect(pathSpy).toHaveBeenCalled();
  });
});
