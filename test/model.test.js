import Collection from '../lib/collection';
import Model from '../lib/model';

/* eslint-disable id-length */
class ProxyModel extends Model {}
class Klass extends Collection {
  url() {
    return '/collection';
  }
}

describe('Schmackbone.Model', () => {
  var doc,
      collection;

  beforeEach(() => {
    doc = new ProxyModel({
      id: '1-the-tempest',
      title: 'The Tempest',
      author: 'Bill Shakespeare',
      length: 123
    });
    collection = new Klass();
    collection.add(doc);

    jest.spyOn(Model.prototype, 'sync');
    jest.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
    ));
  });

  afterEach(() => {
    Model.prototype.sync.mockRestore();
    window.fetch.mockRestore();
  });

  it('preinitialize', () => {
    var model;

    class _Model extends Model {
      preinitialize() {
        this.one = 1;
      }
    }

    model = new _Model({}, {collection});

    expect(model.one).toEqual(1);
    expect(model.collection).toEqual(collection);
  });

  it('initialize', () => {
    var model;

    class _Model extends Model {
      initialize() {
        this.one = 1;
      }
    }

    model = new _Model({}, {collection});

    expect(model.one).toEqual(1);
    expect(model.collection).toEqual(collection);
  });

  test('Object.prototype properties are overridden by attributes', () => {
    var model = new Model({hasOwnProperty: true});

    expect(model.get('hasOwnProperty')).toBe(true);
  });

  test('initialize with attributes and options', () => {
    var model;

    class _Model extends Model {
      initialize(attributes, options) {
        this.one = options.one;
      }
    }

    model = new _Model({}, {one: 1});

    expect(model.one).toEqual(1);
  });

  test('initialize with parsed attributes', () => {
    var model;

    class _Model extends Model {
      parse(attrs) {
        attrs.value += 1;

        return attrs;
      }
    }

    model = new _Model({value: 1}, {parse: true});
    expect(model.get('value')).toEqual(2);
  });

  test('preinitialize occurs before the model is set up', () => {
    var model;

    class _Model extends Model {
      preinitialize() {
        expect(this.collection).not.toBeDefined();
        expect(this.cid).not.toBeDefined();
        expect(this.id).not.toBeDefined();
      }
    }

    model = new _Model({id: 'foo'}, {collection});

    expect(model.collection).toEqual(collection);
    expect(model.id).toEqual('foo');
    expect(model.cid).toBeDefined();
  });

  test('parse can return null', () => {
    var model;

    class _Model extends Model {
      parse(attrs) {
        attrs.value += 1;

        return null;
      }
    }

    model = new _Model({value: 1}, {parse: true});

    expect(JSON.stringify(model.toJSON())).toEqual('{}');
  });

  test('url', () => {
    doc.urlRoot = null;

    expect(doc.url()).toEqual('/collection/1-the-tempest');
    doc.collection.url = '/collection/';

    expect(doc.url()).toEqual('/collection/1-the-tempest');
    doc.collection = null;
    expect(() => doc.url()).toThrow();
    doc.collection = collection;
  });

  test('url when using urlRoot, and uri encoding', () => {
    var model;

    class _Model extends Model {
      urlRoot = '/collection'
    }

    model = new _Model();
    expect(model.url()).toEqual('/collection');
    model.set({id: '+1+'});
    expect(model.url()).toEqual('/collection/%2B1%2B');
  });

  test('url when using urlRoot as a function to determine urlRoot at runtime', () => {
    var model;

    class _Model extends Model {
      urlRoot() {
        return '/nested/' + this.get('parentId') + '/collection';
      }
    }

    model = new _Model({parentId: 1});
    expect(model.url()).toEqual('/nested/1/collection');
    model.set({id: 2});
    expect(model.url()).toEqual('/nested/1/collection/2');
  });

  test('clone', () => {
    var a = new Model({foo: 1, bar: 2, baz: 3}),
        b = a.clone(),
        foo,
        bar;

    expect(a.get('foo')).toEqual(1);
    expect(a.get('bar')).toEqual(2);
    expect(a.get('baz')).toEqual(3);
    expect(b.get('foo')).toEqual(a.get('foo'));
    expect(b.get('bar')).toEqual(a.get('bar'));
    expect(b.get('baz')).toEqual(a.get('baz'));
    a.set({foo: 100});
    expect(a.get('foo')).toEqual(100);
    expect(b.get('foo')).toEqual(1);

    foo = new Model({p: 1});
    bar = new Model({p: 2});
    bar.set(foo.clone().attributes, {unset: true});
    expect(foo.get('p')).toEqual(1);
    expect(bar.get('p')).toEqual(undefined);
  });

  test('isNew', () => {
    var a = new Model({foo: 1, bar: 2, baz: 3});

    expect(a.isNew()).toBe(true);
    a = new Model({foo: 1, bar: 2, baz: 3, id: -5});
    expect(!a.isNew()).toBe(true);
    a = new Model({foo: 1, bar: 2, baz: 3, id: 0});
    expect(!a.isNew()).toBe(true);
    expect(new Model().isNew()).toBe(true);
    expect(!new Model({id: 2}).isNew()).toBe(true);
    expect(!new Model({id: -5}).isNew()).toBe(true);
  });

  test('get', () => {
    expect(doc.get('title')).toEqual('The Tempest');
    expect(doc.get('author')).toEqual('Bill Shakespeare');
  });

  test('pick', () => {
    expect(doc.pick('title')).toEqual({title: 'The Tempest'});
    expect(doc.pick('title', 'author')).toEqual({
      title: 'The Tempest',
      author: 'Bill Shakespeare'
    });
  });

  test('escape', () => {
    expect(doc.escape('title')).toEqual('The Tempest');
    doc.set({audience: 'Bill & Bob'});
    expect(doc.escape('audience')).toEqual('Bill &amp; Bob');
    doc.set({audience: 'Tim > Joan'});
    expect(doc.escape('audience')).toEqual('Tim &gt; Joan');
    doc.set({audience: 10101});
    expect(doc.escape('audience')).toEqual('10101');
    doc.unset('audience');
    expect(doc.escape('audience')).toEqual('');
  });

  test('has', () => {
    var model = new Model();

    expect(model.has('name')).toEqual(false);

    model.set({
      0: 0,
      1: 1,
      true: true,
      false: false,
      empty: '',
      name: 'name',
      null: null,
      undefined
    });

    expect(model.has('0')).toEqual(true);
    expect(model.has('1')).toEqual(true);
    expect(model.has('true')).toEqual(true);
    expect(model.has('false')).toEqual(true);
    expect(model.has('empty')).toEqual(true);
    expect(model.has('name')).toEqual(true);

    model.unset('name');

    expect(model.has('name')).toEqual(false);
    expect(model.has('null')).toEqual(false);
    expect(model.has('undefined')).toEqual(false);
  });

  test('matches', () => {
    var model = new Model();

    expect(model.matches({name: 'Jonas', cool: true})).toEqual(false);

    model.set({name: 'Jonas', cool: true});

    expect(model.matches({name: 'Jonas'})).toEqual(true);
    expect(model.matches({name: 'Jonas', cool: true})).toEqual(true);
    expect(model.matches({name: 'Jonas', cool: false})).toEqual(false);
  });

  test('matches with predicate', () => {
    var model = new Model({a: 0});

    expect(model.matches((attr) => attr.a > 1 && attr.b)).toEqual(false);
    model.set({a: 3, b: true});
    expect(model.matches((attr) => attr.a > 1 && attr.b)).toEqual(true);
  });

  test('set and unset', () => {
    var a = new Model({id: 'id', foo: 1, bar: 2, baz: 3}),
        changeCount = 0;

    a.on('change:foo', () => changeCount += 1);
    a.set({foo: 2});
    expect(a.get('foo')).toEqual(2);
    expect(changeCount).toEqual(1);
    // set with value that is not new shouldn't fire change event
    a.set({foo: 2});
    expect(a.get('foo')).toEqual(2);
    expect(changeCount).toEqual(1);

    a.validate = (attrs) => {
      expect(attrs.foo).not.toBeDefined();
    };

    a.unset('foo', {validate: true});
    expect(a.get('foo')).not.toBeDefined();
    delete a.validate;
    expect(changeCount).toEqual(2);

    a.unset('id');
    expect(a.id).not.toBeDefined();
  });

  test('#2030 - set with failed validate, followed by another set triggers change', () => {
    var attr = 0,
        main = 0,
        error = 0,
        model;

    class _Model extends Model {
      validate(attrs) {
        if (attrs.x > 1) {
          error++;

          return 'this is an error';
        }
      }
    }

    model = new _Model({x: 0});
    model.on('change:x', () => attr++);
    model.on('change', () => main++);
    model.set({x: 2}, {validate: true});
    model.set({x: 1}, {validate: true});
    expect([attr, main, error]).toEqual([1, 1, 1]);
  });

  test('set triggers changes in the correct order', () => {
    var value = null,
        model = new Model;

    model.on('last', () => value = 'last');
    model.on('first', () => value = 'first');
    model.trigger('first');
    model.trigger('last');

    expect(value).toEqual('last');
  });

  test('set falsy values in the correct order', () => {
    var model = new Model({result: 'result'});

    model.on('change', () => {
      expect(model.changed.result).not.toBeDefined();
      expect(model.previous('result')).toBe(false);
    });
    model.set({result: undefined}, {silent: true});
    model.set({result: null}, {silent: true});
    model.set({result: false}, {silent: true});
    model.set({result: undefined});
  });

  test('nested set triggers with the correct options', () => {
    var model = new Model(),
        o1 = {},
        o2 = {},
        o3 = {};

    model.on('change', (__, options) => {
      switch (model.get('a')) {
        case 1:
          expect(options).toEqual(o1);

          return model.set('a', 2, o2);
        case 2:
          expect(options).toEqual(o2);

          return model.set('a', 3, o3);
        case 3:
          expect(options).toEqual(o3);
        // no default
      }
    });
    model.set('a', 1, o1);
  });

  test('multiple unsets', () => {
    var i = 0,
        counter = () => i++,
        model = new Model({a: 1});

    model.on('change:a', counter);
    model.set({a: 2});
    model.unset('a');
    model.unset('a');
    expect(i).toEqual(2);
  });

  test('unset and changedAttributes', () => {
    var model = new Model({a: 1});

    model.on('change', () => {
      expect('a' in model.changedAttributes()).toBe(true);
    });
    model.unset('a');
  });

  test('using a non-default id attribute.', () => {
    var model;

    class MongoModel extends Model {
      static idAttribute = '_id'
    }

    model = new MongoModel({id: 'eye-dee', _id: 25, title: 'Model'});
    expect(model.get('id')).toEqual('eye-dee');
    expect(model.id).toEqual(25);
    expect(model.isNew()).toBe(false);
    model.unset('_id');
    expect(model.id).not.toBeDefined();
    expect(model.isNew()).toBe(true);
  });

  test('setting an alternative cid prefix', () => {
    var model,
        col;

    class _Model extends Model {
      static cidPrefix = 'm'
    }

    class _Collection extends Collection {
      static model = _Model
    }
    model = new _Model();
    expect(model.cid.charAt(0)).toEqual('m');
    model = new Model();
    expect(model.cid.charAt(0)).toEqual('c');

    col = new _Collection([{id: 'c5'}, {id: 'c6'}, {id: 'c7'}]);

    expect(col.get('c6').cid.charAt(0)).toEqual('m');
    col.set([{id: 'c6', value: 'test'}], {
      merge: true,
      add: true,
      remove: false
    });
    expect(col.get('c6').has('value')).toBe(true);
  });

  test('set an empty string', () => {
    var model = new Model({name: 'Model'});

    model.set({name: ''});
    expect(model.get('name')).toEqual('');
  });

  test('setting an object', () => {
    var model = new Model({custom: {foo: 1}}),
        spy = jest.fn();

    model.on('change', spy);
    // no change should be fired
    model.set({custom: {foo: 1}});
    expect(spy).not.toHaveBeenCalled();
    // change event should be fired
    model.set({custom: {foo: 2}});
    expect(spy).toHaveBeenCalled();
  });

  test('clear', () => {
    var changed,
        model = new Model({id: 1, name: 'Model'});

    model.on('change:name', () => changed = true);
    model.on('change', () => {
      var changedAttrs = model.changedAttributes();

      expect('name' in changedAttrs).toBe(true);
    });
    model.clear();
    expect(changed).toBe(true);
    expect(model.get('name')).not.toBeDefined();
  });

  test('defaults', () => {
    var model;

    class Defaulted extends Model {
      static defaults = {one: 1, two: 2}
    }

    class Defaulted2 extends Model {
      static defaults() {
        return {
          one: 3,
          two: 4
        };
      }
    }

    class Defaulted3 extends Model {
      static defaults = {hasOwnProperty: true}
    }

    model = new Defaulted();
    expect(model.get('one')).toEqual(1);
    expect(model.get('two')).toEqual(2);
    model = new Defaulted({two: undefined});
    expect(model.get('one')).toEqual(1);
    expect(model.get('two')).not.toBeDefined();
    model = new Defaulted({two: 3});
    expect(model.get('one')).toEqual(1);
    expect(model.get('two')).toEqual(3);

    model = new Defaulted2();
    expect(model.get('one')).toEqual(3);
    expect(model.get('two')).toEqual(4);
    model = new Defaulted2({two: undefined});
    expect(model.get('one')).toEqual(3);
    expect(model.get('two')).not.toBeDefined();
    model = new Defaulted2({two: 2});
    expect(model.get('one')).toEqual(3);
    expect(model.get('two')).toEqual(2);

    model = new Defaulted3();
    expect(model.get('hasOwnProperty')).toBe(true);
    model = new Defaulted3({hasOwnProperty: undefined});
    expect(model.get('hasOwnProperty')).not.toBeDefined();
    model = new Defaulted3({hasOwnProperty: false});
    expect(model.get('hasOwnProperty')).toBe(false);
  });

  test('change, hasChanged, changedAttributes, previous, previousAttributes', () => {
    var model = new Model({name: 'Tim', age: 10});

    expect(model.changedAttributes()).toBe(false);
    model.on('change', () => {
      expect(model.hasChanged('name')).toBe(true);
      expect(!model.hasChanged('age')).toBe(true);
      expect(model.changedAttributes()).toEqual({name: 'Rob'});
      expect(model.previous('name')).toEqual('Tim');
      expect(model.previousAttributes()).toEqual({name: 'Tim', age: 10});
    });

    expect(model.hasChanged()).toBe(false);
    expect(model.hasChanged(undefined)).toBe(false);
    model.set({name: 'Rob'});
    expect(model.get('name')).toEqual('Rob');
  });

  test('changedAttributes', () => {
    var model = new Model({a: 'a', b: 'b'});

    expect(model.changedAttributes()).toBe(false);
    expect(model.changedAttributes({a: 'a'})).toBe(false);
    expect(model.changedAttributes({a: 'b'}).a).toEqual('b');
  });

  test('change with options', () => {
    var value,
        model = new Model({name: 'Rob'});

    model.on('change', (m, options) => {
      value = options.prefix + m.get('name');
    });

    model.set({name: 'Bob'}, {prefix: 'Mr. '});
    expect(value).toEqual('Mr. Bob');
    model.set({name: 'Sue'}, {prefix: 'Ms. '});
    expect(value).toEqual('Ms. Sue');
  });

  test('change after initialize', () => {
    var changed = 0,
        attrs = {id: 1, label: 'c'},
        obj = new Model(attrs);

    obj.on('change', () => changed += 1);
    obj.set(attrs);
    expect(changed).toEqual(0);
  });

  test('save within change event', () => {
    var model = new Model({firstName: 'Taylor', lastName: 'Swift'});

    jest.spyOn(model, 'save').mockReturnValue();

    model.url = '/test';
    model.on('change', () => model.save());
    model.set({lastName: 'Hicks'});
    expect(model.save).toHaveBeenCalled();
  });

  test('validate after save', () => {
    var lastError,
        model = new Model();

    model.validate = (attrs) => {
      if (attrs.admin) {
        return 'Can\'t change admin status.';
      }
    };

    model.sync = (method, m, options) => options.success({admin: true});
    model.on('invalid', (m, error) => lastError = error);
    model.save(null);

    expect(lastError).toEqual('Can\'t change admin status.');
    expect(model.validationError).toEqual('Can\'t change admin status.');
  });

  test('save', () => {
    doc.save({title: 'Henry V'});
    expect(doc.sync).toHaveBeenCalledWith('update', doc, expect.any(Object));
  });

  test('save, fetch, destroy triggers error event when an error occurs', () => {
    var model = new Model(),
        errorSpy = jest.fn();

    model.on('error', errorSpy);
    model.sync = (method, m, options) => options.error();
    model.save({data: 2, id: 1}).catch(() => {});
    model.fetch().catch(() => {});
    model.destroy().catch(() => {});

    expect(errorSpy).toHaveBeenCalledTimes(3);
  });

  test('#3283 - save, fetch, destroy calls success with context', () => {
    var model = new Model(),
        obj = {},
        options = {
          context: obj,
          success() {
            expect(this).toEqual(obj);
          }
        };

    jest.spyOn(model, 'sync').mockImplementation(
      (method, m, opts) => opts.success.call(opts.context)
    );
    model.save({data: 2, id: 1}, options);
    model.fetch(options);
    model.destroy(options);
  });

  test('#3283 - save, fetch, destroy calls error with context', async() => {
    var model = new Model(),
        obj = {},
        options = {
          context: obj,
          error() {
            expect(this).toEqual(obj);
          }
        };

    jest.spyOn(model, 'sync').mockImplementation(
      (method, m, opts) => opts.error.call(opts.context)
    );

    await model.save({data: 2, id: 1}, options).catch(() => {});
    await model.fetch(options).catch(() => {});
    await model.destroy(options).catch(() => {});
  });

  test('save, fetch, destroy calls complete if passed on success', async() => {
    var model = new Model({id: 'foo'}),
        options = {complete: jest.fn()},
        methods = ['save', 'fetch', 'destroy'];

    model.url = '/url';

    for (let method of methods) {
      let args = method === 'save' ? [{}, options] : [options];

      await model[method](...args);
      expect(options.complete).toHaveBeenCalled();
      options.complete.mockClear();
    }
  });

  test('save, fetch, destroy calls complete if passed on error', async() => {
    var model = new Model({id: 'foo'}),
        options = {complete: jest.fn()},
        methods = ['save', 'fetch', 'destroy'];

    model.url = '/url';

    window.fetch.mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 400})
    ));

    for (let method of methods) {
      let args = method === 'save' ? [{}, options] : [options];

      await model[method](...args).catch(() => {});
      expect(options.complete).toHaveBeenCalled();
      options.complete.mockClear();
    }
  });

  test('save, fetch, destroy return a promise that resolves an array of model and response',
    async() => {
      await Promise.all(['save', 'fetch', 'destroy'].map((method) => new Promise((res) => {
        var model = new Model({id: 'foo'});

        model.sync = (meth, mod, options) => Promise.resolve('resolved').then(options.success);

        model[method]({}).then(([_model, resp, options]) => {
          expect(_model).toEqual(model);
          expect(resp).toEqual('resolved');

          model.sync = (meth, mod, _options) => Promise.reject('rejected').catch(options.error);
          model[method]({}).catch(([__model, __resp, _options]) => {
            expect(__model).toEqual(model);
            expect(__resp).toEqual('rejected');
            res();
          });
        });
      })));
    });

  test('#3470 - save and fetch with parse false', () => {
    var i = 0,
        model = new Model();

    model.parse = jest.fn();
    model.sync = (method, m, options) => options.success({i: ++i});

    model.fetch({parse: false});
    expect(model.parse).not.toHaveBeenCalled();
    expect(model.get('i')).toEqual(i);
    model.save(null, {parse: false});
    expect(model.parse).not.toHaveBeenCalled();
    expect(model.get('i')).toEqual(i);
  });

  test('save with PATCH', () => {
    doc.clear().set({id: 1, a: 1, b: 2, c: 3, d: 4});
    doc.save();
    expect(doc.sync).toHaveBeenCalled();
    expect(doc.sync.mock.calls[0][0]).toEqual('update');
    expect(doc.sync.mock.calls[0][2].attrs).not.toBeDefined();
    doc.sync.mockClear();

    doc.save({b: 2, d: 4}, {patch: true});
    expect(doc.sync).toHaveBeenCalled();
    expect(doc.sync.mock.calls[0][0]).toEqual('patch');
    expect(doc.sync.mock.calls[0][2].attrs).toEqual({b: 2, d: 4});
  });

  test('save with PATCH and different attrs', () => {
    doc.clear().save({b: 2, d: 4}, {patch: true, attrs: {B: 1, D: 3}});

    expect(doc.sync).toHaveBeenCalled();
    expect(doc.sync.mock.calls[0][2].attrs.B).toEqual(1);
    expect(doc.sync.mock.calls[0][2].attrs.D).toEqual(3);
    expect(doc.sync.mock.calls[0][2].attrs.d).not.toBeDefined();
    expect(doc.attributes).toEqual({b: 2, d: 4});
  });

  test('save in positional style', () => {
    var model = new Model();

    model.sync = (method, m, options) => options.success();
    model.save('title', 'Twelfth Night');
    expect(model.get('title')).toEqual('Twelfth Night');
  });

  test('save with wait and supplied id', async() => {
    var model;

    class _Model extends Model {
      urlRoot = '/collection'
    }

    model = new _Model();
    await model.save({id: 42}, {wait: true});
    expect(window.fetch).toHaveBeenCalled();
    expect(window.fetch.mock.calls[0][0]).toEqual('/collection/42');
  });

  test('save will pass extra options to success callback', async() => {
    var model;

    class SpecialSyncModel extends Model {
      sync(method, m, options) {
        Object.assign(options, {specialSync: true});

        return Promise.resolve([model, options]);
      }

      urlRoot = '/test'
    }

    model = new SpecialSyncModel();

    await model.save(null).then(([_model, options]) => {
      expect(options.specialSync).toBe(true);
    });
  });

  test('fetch', async() => {
    var result = doc.fetch();

    await result;
    expect(result instanceof Promise).toBe(true);

    expect(doc.sync.mock.calls[0][0]).toEqual('read');
    expect(doc.sync.mock.calls[0][1]).toEqual(doc);
  });

  test('fetch will pass extra options to success callback', async() => {
    var model;

    class SpecialSyncModel extends Model {
      sync(method, m, options) {
        Object.assign(options, {specialSync: true});

        return Promise.resolve([model, options]);
      }

      urlRoot = '/test'
    }

    model = new SpecialSyncModel();

    await model.fetch().then(([_model, options]) => {
      expect(options.specialSync).toBe(true);
    });
  });

  test('destroy', async() => {
    var result = doc.destroy();

    expect(result instanceof Promise).toBe(true);
    await result;

    expect(doc.sync.mock.calls[0][0]).toEqual('delete');
    expect(doc.sync.mock.calls[0][1]).toEqual(doc);
  });

  test('destroy will pass extra options to success callback', async() => {
    var model;

    class SpecialSyncModel extends Model {
      sync(method, m, options) {
        Object.assign(options, {specialSync: true});

        return Promise.resolve([model, options]);
      }

      urlRoot = '/test'
    }

    model = new SpecialSyncModel({id: '1234'});

    await model.destroy().then(([_model, options]) => {
      expect(options.specialSync).toBe(true);
    });
  });

  test('non-persisted destroy', async() => {
    var a = new Model({foo: 1, bar: 2, baz: 3});

    a.sync = function() {
      throw new Error('should not be called');
    };

    await a.destroy();
  });

  test('validate', () => {
    var lastError,
        model = new Model(),
        result;

    model.validate = function(attrs) {
      if (attrs.admin !== this.get('admin')) {
        return 'Can\'t change admin status.';
      }
    };

    model.on('invalid', (m, error) => lastError = error);

    result = model.set({a: 100});
    expect(result).toEqual(model);
    expect(model.get('a')).toEqual(100);
    expect(lastError).not.toBeDefined();

    result = model.set({admin: true});
    expect(model.get('admin')).toBe(true);

    result = model.set({a: 200, admin: false}, {validate: true});
    expect(lastError).toEqual('Can\'t change admin status.');
    expect(result).toBe(false);
    expect(model.get('a')).toEqual(100);
  });

  test('validate on unset and clear', () => {
    var error,
        model = new Model({name: 'One'});

    model.validate = (attrs) => {
      if (!attrs.name) {
        error = true;

        return 'No thanks.';
      }
    };

    model.set({name: 'Two'});
    expect(model.get('name')).toEqual('Two');
    expect(error).not.toBeDefined();
    model.unset('name', {validate: true});
    expect(error).toBe(true);
    expect(model.get('name')).toEqual('Two');
    model.clear({validate: true});
    expect(model.get('name')).toEqual('Two');
    delete model.validate;
    model.clear();
    expect(model.get('name')).not.toBeDefined();
  });

  test('validate with error callback', () => {
    var invalidSpy = jest.fn(),
        model = new Model(),
        result;

    model.validate = (attrs) => {
      if (attrs.admin) {
        return 'Can\'t change admin status.';
      }
    };

    model.on('invalid', invalidSpy);

    result = model.set({a: 100}, {validate: true});
    expect(result).toEqual(model);
    expect(model.get('a')).toEqual(100);
    expect(model.validationError).toBe(null);
    expect(invalidSpy).not.toHaveBeenCalled();

    result = model.set({a: 200, admin: true}, {validate: true});
    expect(result).toBe(false);
    expect(model.get('a')).toEqual(100);
    expect(model.validationError).toEqual('Can\'t change admin status.');
    expect(invalidSpy).toHaveBeenCalled();
  });

  test('defaults always extend attrs (#459)', () => {
    class Defaulted extends Model {
      static defaults = {one: 1}

      initialize(attrs, opts) {
        expect(this.attributes.one).toEqual(1);
      }
    }

    new Defaulted({});
    new Defaulted();
  });

  test('inherit class properties', () => {
    var adult,
        kid;

    class Parent extends Model {
      instancePropSame() {}

      instancePropDiff() {}

      static classProp() {}
    }

    class Child extends Parent {
      instancePropDiff() {}
    }

    adult = new Parent;
    kid = new Child;

    expect(Child.classProp).toEqual(Parent.classProp);
    expect(Child.classProp).toBeDefined();

    expect(kid.instancePropSame).toEqual(adult.instancePropSame);
    expect(kid.instancePropSame).toBeDefined();

    expect(Child.prototype.instancePropDiff).not.toEqual(Parent.prototype.instancePropDiff);
    expect(Child.prototype.instancePropDiff).toBeDefined();
  });

  test('Nested change events don\'t clobber previous attributes', () => {
    new Model()
        .on('change:state', (m, newState) => {
          expect(m.previous('state')).not.toBeDefined();
          expect(newState).toEqual('hello');
          // Fire a nested change event.
          m.set({other: 'whatever'});
        })
        .on('change:state', (m, newState) => {
          expect(m.previous('state')).not.toBeDefined();
          expect(newState).toEqual('hello');
        })
        .set({state: 'hello'});
  });

  test('hasChanged/set should use same comparison', () => {
    var model = new Model({a: null}),
        changeSpy = jest.fn();

    model.on('change', function() {
      expect(this.hasChanged('a')).toBe(true);
    }).on('change:a', changeSpy).set({a: undefined});

    expect(changeSpy).toHaveBeenCalled();
  });

  test('#582, #425, change:attribute callbacks should fire after all changes have occurred', () => {
    var model = new Model;

    var assertion = function() {
      expect(model.get('a')).toEqual('a');
      expect(model.get('b')).toEqual('b');
      expect(model.get('c')).toEqual('c');
    };

    model.on('change:a', assertion);
    model.on('change:b', assertion);
    model.on('change:c', assertion);

    model.set({a: 'a', b: 'b', c: 'c'});
  });

  test('#871, set with attributes property', () => {
    var model = new Model();

    model.set({attributes: true});
    expect(model.has('attributes')).toBe(true);
  });

  test('set value regardless of equality/change', () => {
    var model = new Model({x: []}),
        a = [];

    model.set({x: a});
    expect(model.get('x')).toEqual(a);
  });

  test('set same value does not trigger change', () => {
    var model = new Model({x: 1}),
        changeSpy = jest.fn();

    model.on('change change:x', changeSpy);
    model.set({x: 1});
    model.set({x: 1});

    expect(changeSpy).not.toHaveBeenCalled();
  });

  test('unset does not fire a change for undefined attributes', () => {
    var model = new Model({x: undefined}),
        changeSpy = jest.fn();

    model.on('change:x', changeSpy);
    model.unset('x');
    expect(changeSpy).not.toHaveBeenCalled();
  });

  test('set: undefined values', () => {
    var model = new Model({x: undefined});

    expect('x' in model.attributes).toBe(true);
  });

  test('hasChanged works outside of change events, and true within', () => {
    var model = new Model({x: 1});

    model.on('change:x', () => {
      expect(model.hasChanged('x')).toBe(true);
      expect(model.get('x')).toEqual(1);
    });

    model.set({x: 2}, {silent: true});

    expect(model.hasChanged()).toBe(true);
    expect(model.hasChanged('x')).toBe(true);

    model.set({x: 1});
    expect(model.hasChanged()).toBe(true);
    expect(model.hasChanged('x')).toBe(true);
  });

  test('hasChanged gets cleared on the following set', () => {
    var model = new Model;

    model.set({x: 1});
    expect(model.hasChanged()).toBe(true);
    model.set({x: 1});
    expect(!model.hasChanged()).toBe(true);
    model.set({x: 2});
    expect(model.hasChanged()).toBe(true);
    model.set({});
    expect(!model.hasChanged()).toBe(true);
  });

  test('save with `wait` succeeds without `validate`', () => {
    var model = new Model();

    jest.spyOn(model, 'sync').mockReturnValue();
    model.url = '/test';
    model.save({x: 1}, {wait: true});

    expect(model.sync.mock.calls[0][1]).toEqual(model);
  });

  test('save without `wait` doesn\'t set invalid attributes', () => {
    var model = new Model();

    model.validate = () => 1;

    jest.spyOn(model, 'sync').mockReturnValue();
    model.save({a: 1});
    expect(model.get('a')).not.toBeDefined();
  });

  test('save doesn\'t validate twice', () => {
    var model = new Model();

    model.sync = () => false;
    model.validate = jest.fn();
    model.save({});
    expect(model.validate).toHaveBeenCalledTimes(1);
  });

  test('`hasChanged` for falsey keys', () => {
    var model = new Model();

    model.set({x: true}, {silent: true});
    expect(!model.hasChanged(0)).toBe(true);
    expect(!model.hasChanged('')).toBe(true);
  });

  test('`previous` for falsey keys', () => {
    var model = new Model({0: true, '': true});

    model.set({0: false, '': false}, {silent: true});
    expect(model.previous(0)).toBe(true);
    expect(model.previous('')).toBe(true);
  });

  test('`save` with `wait` sends correct attributes', async() => {
    var changedSpy = jest.fn(),
        model = new Model({x: 1, y: 2}),
        save;

    model.url = '/test';
    model.on('change:x', changedSpy);
    window.fetch.mockImplementation(() => Promise.resolve(
      new Response(new Blob([JSON.stringify({x: 3})], {type: 'application/json'}), {status: 200})
    ));

    save = model.save({x: 3}, {wait: true});

    expect(JSON.parse(window.fetch.mock.calls[0][1].data)).toEqual({x: 3, y: 2});
    expect(model.get('x')).toEqual(1);
    expect(changedSpy).not.toHaveBeenCalled();

    await save;
    expect(model.get('x')).toEqual(3);
    expect(changedSpy).toHaveBeenCalled();
  });

  test('a failed `save` with `wait` doesn\'t leave attributes behind', async() => {
    var model = new Model,
        save;

    model.url = '/test';

    save = model.save({x: 1}, {wait: true});

    expect(model.get('x')).not.toBeDefined();
    await save;
  });

  test('#1030 - `save` with `wait` results in correct attributes if success is called during sync',
    () => {
      var model = new Model({x: 1, y: 2}),
          changeSpy = jest.fn();

      model.sync = (method, m, options) => options.success();

      model.on('change:x', changeSpy);
      model.save({x: 3}, {wait: true});
      expect(model.get('x')).toEqual(3);
    });

  test('save with wait validates attributes', async() => {
    var model = new Model();

    model.url = '/test';
    model.validate = jest.fn();
    await model.save({x: 1}, {wait: true});

    expect(model.validate).toHaveBeenCalled();
  });

  test('save turns on parse flag', async() => {
    class _Model extends Model {
      url() {
        return '/url';
      }
    }

    await new _Model().save();
    expect(Model.prototype.sync.mock.calls[0][2].parse).toBe(true);
  });

  test('nested `set` during `change:attr`', () => {
    var events = [],
        model = new Model();

    model.on('all', (event) => events.push(event));
    model.on('change', () => model.set({z: true}, {silent: true}));
    model.on('change:x', () => model.set({y: true}));
    model.set({x: true});

    expect(events).toEqual(['change:y', 'change:x', 'change']);
    events = [];
    model.set({z: true});
    expect(events).toEqual([]);
  });

  test('nested `change` only fires once', () => {
    var model = new Model(),
        changeSpy = jest.fn(() => model.set({x: true}));

    model.on('change', changeSpy);
    model.set({x: true});
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });

  test('nested `set` during `change`', () => {
    var count = 0,
        model = new Model();

    model.on('change', function() {
      switch (count++) {
        case 0:
          expect(this.changedAttributes()).toEqual({x: true});
          expect(model.previous('x')).not.toBeDefined();
          model.set({y: true});
          break;
        case 1:
          expect(this.changedAttributes()).toEqual({x: true, y: true});
          expect(model.previous('x')).not.toBeDefined();
          model.set({z: true});
          break;
        case 2:
          expect(this.changedAttributes()).toEqual({x: true, y: true, z: true});
          expect(model.previous('y')).not.toBeDefined();
          break;
        // no default
      }
    });

    model.set({x: true});
  });

  test('nested `change` with silent', () => {
    var count = 0,
        model = new Model(),
        changeSpy = jest.fn();

    model.on('change:y', changeSpy);
    model.on('change', function() {
      switch (count++) {
        case 0:
          expect(this.changedAttributes()).toEqual({x: true});
          model.set({y: true}, {silent: true});
          model.set({z: true});
          break;
        case 1:
          expect(this.changedAttributes()).toEqual({x: true, y: true, z: true});
          break;
        case 2:
          expect(this.changedAttributes()).toEqual({z: false});
          break;
        // no default
      }
    });

    model.set({x: true});
    model.set({z: false});
    expect(changeSpy).not.toHaveBeenCalled();
  });

  test('nested `change:attr` with silent', () => {
    var model = new Model(),
        changeSpy = jest.fn();

    model.on('change:y', changeSpy);
    model.on('change', () => {
      model.set({y: true}, {silent: true});
      model.set({z: true});
    });
    model.set({x: true});
    expect(changeSpy).not.toHaveBeenCalled();
  });

  test('multiple nested changes with silent', () => {
    var model = new Model();

    model.on('change:x', () => {
      model.set({y: 1}, {silent: true});
      model.set({y: 2});
    });

    model.on('change:y', (m, val) => {
      expect(val).toEqual(2);
    });
    model.set({x: true});
  });

  test('multiple nested changes with silent', () => {
    var changes = [],
        model = new Model();

    model.on('change:b', (m, val) => changes.push(val));
    model.on('change', () => model.set({b: 1}));
    model.set({b: 0});
    expect(changes).toEqual([0, 1]);
  });

  test('basic silent change semantics', () => {
    var model = new Model,
        changeSpy = jest.fn();

    model.set({x: 1});
    model.on('change', changeSpy);
    model.set({x: 2}, {silent: true});
    model.set({x: 1});

    expect(changeSpy).toHaveBeenCalled();
  });

  test('nested set multiple times', () => {
    var model = new Model(),
        changeSpy = jest.fn();

    model.on('change:b', changeSpy);
    model.on('change:a', () => {
      model.set({b: true});
      model.set({b: true});
    });
    model.set({a: true});
    expect(changeSpy).toHaveBeenCalled();
  });

  test('#1122 - clear does not alter options', () => {
    var model = new Model(),
        options = {};

    model.clear(options);
    expect(!options.unset).toBe(true);
  });

  test('#1122 - unset does not alter options.', () => {
    var model = new Model(),
        options = {};

    model.unset('x', options);
    expect(!options.unset).toBe(true);
  });

  test('#1355 - `options` is passed to success callbacks', async() => {
    var opts = {
      success: (m, resp, options) => {
        expect(options).toBeDefined();
      }
    };

    await doc.save({id: 1}, opts);
    await doc.fetch(opts);
    await doc.save({id: 1}, opts).then(([model, resp, options]) => {
      expect(options).toBeDefined();
    });
    await doc.destroy(opts);
  });

  test('#1412 - Trigger `sync` event.', async() => {
    var syncSpy = jest.fn();

    doc.on('sync', syncSpy);
    await doc.fetch();
    await doc.save();
    await doc.destroy();

    expect(syncSpy).toHaveBeenCalledTimes(3);
  });

  test('#1365 - Destroy: New models execute success callback.', async() => {
    var syncSpy = jest.fn(),
        destroySpy = jest.fn(),
        successSpy = jest.fn();

    await new Model()
        .on('sync', syncSpy)
        .on('destroy', destroySpy)
        .destroy().then(successSpy);
  });

  test('#1433 - Save: An invalid model cannot be persisted.', () => {
    var model = new Model;

    model.validate = () => 'invalid';
    expect(model.save()).toEqual(false);
    expect(model.sync).not.toHaveBeenCalled();
  });

  test('#1377 - Save without attrs triggers `error`.', async() => {
    var model,
        invalidSpy = jest.fn();

    class _Model extends Model {
      url = '/test/'

      validate = () => 'invalid'
    }

    model = new _Model({id: 1});
    model.on('invalid', invalidSpy);

    await model.save();
    expect(invalidSpy).toHaveBeenCalled();
  });

  test('#1545 - `undefined` can be passed to a model constructor without coersion', () => {
    class _Model extends Model {
      static defaults = {one: 1}

      initialize(attrs, opts) {
        expect(attrs).not.toBeDefined();
      }
    }

    new _Model();
    new _Model(undefined);
  });

  test('#1478 - Model `save` does not trigger change on unchanged attributes', async() => {
    var changeSpy = jest.fn();

    class _Model extends Model {
      url() {
        return '/url';
      }
    }

    await new _Model({x: true})
        .on('change:x', changeSpy)
        .save(null);

    expect(changeSpy).not.toHaveBeenCalled();
  });

  test('#1664 - Changing from one value, silently to another, back to original triggers a change.',
    () => {
      var model = new Model({x: 1}),
          changeSpy = jest.fn();

      model.on('change:x', changeSpy);
      model.set({x: 2}, {silent: true});
      model.set({x: 3}, {silent: true});
      model.set({x: 1});
      expect(changeSpy).toHaveBeenCalled();
    });

  test('#1664 - multiple silent changes nested inside a change event', () => {
    var changes = [],
        model = new Model();

    model.on('change', () => {
      model.set({a: 'c'}, {silent: true});
      model.set({b: 2}, {silent: true});
      model.unset('c', {silent: true});
    });
    model.on('change:a change:b change:c', (m, val) => changes.push(val));
    model.set({a: 'a', b: 1, c: 'item'});
    expect(changes).toEqual(['a', 1, 'item']);
    expect(model.attributes).toEqual({a: 'c', b: 2});
  });

  test('#1791 - `attributes` is available for `parse`', () => {
    class _Model extends Model {
      // shouldn't throw an error
      parse() {
        this.has('a');
      }
    }

    expect(() => new _Model(null, {parse: true})).not.toThrow();
  });

  test('silent changes in last `change` event back to original triggers change', () => {
    var changes = [],
        model = new Model();

    model.on('change:a change:b change:c', (m, val) => changes.push(val));
    model.on('change', () => model.set({a: 'c'}, {silent: true}));
    model.set({a: 'a'});
    expect(changes).toEqual(['a']);
    model.set({a: 'a'});
    expect(changes).toEqual(['a', 'a']);
  });

  test('#1943 change calculations should use _.isEqual', () => {
    var model = new Model({a: {key: 'value'}});

    model.set('a', {key: 'value'}, {silent: true});
    expect(model.changedAttributes()).toBe(false);
  });

  test('#1964 - final `change` event is always fired, regardless of interim changes', () => {
    var model = new Model(),
        changeSpy = jest.fn();

    model.on('change:property', () => model.set('property', 'bar'));
    model.on('change', changeSpy);
    model.set('property', 'foo');
    expect(changeSpy).toHaveBeenCalled();
  });

  test('isValid', () => {
    var model = new Model({valid: true});

    model.validate = (attrs) => {
      if (!attrs.valid) {
        return 'invalid';
      }
    };

    expect(model.isValid()).toBe(true);
    expect(model.set({valid: false}, {validate: true})).toBe(false);
    expect(model.isValid()).toBe(true);
    model.set({valid: false});
    expect(model.isValid()).toBe(false);
    expect(!model.set('valid', false, {validate: true})).toBe(true);
  });

  test('#1179 - isValid returns true in the absence of validate.', () => {
    var model = new Model();

    model.validate = null;

    expect(model.isValid()).toBe(true);
  });

  test('#1961 - Creating a model with {validate:true} will call validate and use the error ' +
      'callback', () => {
    var model;

    class _Model extends Model {
      validate(attrs) {
        if (attrs.id === 1) {
          return 'This shouldn\'t happen';
        }
      }
    }

    model = new _Model({id: 1}, {validate: true});
    expect(model.validationError).toEqual('This shouldn\'t happen');
  });

  test('toJSON receives attrs during save(..., {wait: true})', () => {
    var model;

    class _Model extends Model {
      url() {
        return '/test';
      }

      toJSON() {
        expect(this.attributes.x).toEqual(1);

        return {...this.attributes};
      }
    }
    model = new _Model;
    model.save({x: 1}, {wait: true});
  });

  test('#2034 - nested set with silent only triggers one change', () => {
    var model = new Model(),
        spy = jest.fn();

    model.on('change', () => {
      model.set({b: true}, {silent: true});
      spy();
    });

    model.set({a: true});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('#3778 - id will only be updated if it is set', () => {
    var model = new Model({id: 1});

    model.id = 2;
    model.set({foo: 'bar'});
    expect(model.id).toEqual(2);
    model.set({id: 3});
    expect(model.id).toEqual(3);
  });
});
