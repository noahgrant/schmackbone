import Collection from '../lib/collection';
import Model from '../lib/model';
import {omit} from 'underscore';

describe('Schmackbone.Collection', () => {
  /* eslint-disable id-length */
  var a,
      b,
      c,
      d,
      col;

  beforeEach(() => {
    a = new Model({id: 3, label: 'a'});
    b = new Model({id: 2, label: 'b'});
    c = new Model({id: 1, label: 'c'});
    d = new Model({id: 0, label: 'd'});
    col = new Collection([a, b, c, d]);

    jest.spyOn(Collection.prototype, 'sync');
    jest.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
    ));
  });

  afterEach(() => {
    Collection.prototype.sync.mockRestore();
    window.fetch.mockRestore();
  });

  test('new and sort', () => {
    var counter = 0,
        sortedCol;

    // using static property for comparator
    class _Collection extends Collection {
      static comparator = (model) => model.id
    }

    col.on('sort', () => counter++);
    expect(col.pluck('label')).toEqual(['a', 'b', 'c', 'd']);

    col.comparator = (m1, m2) => m1.id > m2.id ? -1 : 1;
    col.sort();

    expect(counter).toEqual(1);
    expect(col.pluck('label')).toEqual(['a', 'b', 'c', 'd']);

    col.comparator = (model) => model.id;
    col.sort();

    expect(counter).toEqual(2);
    expect(col.pluck('label')).toEqual(['d', 'c', 'b', 'a']);

    sortedCol = new _Collection([a, b, c, d]);
    expect(sortedCol.pluck('label')).toEqual(['d', 'c', 'b', 'a']);
  });

  test('String comparator', () => {
    var collection = new Collection([{id: 3}, {id: 1}, {id: 2}], {comparator: 'id'});

    // using static property for comparator
    class _Collection extends Collection {
      static comparator = 'id'
    }

    expect(collection.pluck('id')).toEqual([1, 2, 3]);

    collection = new _Collection([{id: 3}, {id: 1}, {id: 2}]);
    expect(collection.pluck('id')).toEqual([1, 2, 3]);
  });

  test('new and parse', () => {
    var models,
        collection;

    class _Collection extends Collection {
      parse(data) {
        return data.filter((datum) => datum.a % 2 === 0);
      }
    }

    models = [{a: 1}, {a: 2}, {a: 3}, {a: 4}];
    collection = new _Collection(models, {parse: true});

    expect(collection.length).toEqual(2);
    expect(collection.at(0).get('a')).toEqual(2);
    expect(collection.at(1).get('a')).toEqual(4);
  });

  test('clone preserves model and comparator', () => {
    var comparator = (model) => model.id,
        collection;

    class _Model extends Model {}

    collection = new Collection([{id: 1}], {model: _Model, comparator}).clone();
    collection.add({id: 2});
    expect(collection.at(0)).toBeInstanceOf(_Model);
    expect(collection.at(1)).toBeInstanceOf(_Model);
    expect(collection.comparator).toEqual(comparator);
  });

  test('clone preserves static model', () => {
    var collection;

    class _Model extends Model {}
    class _Model2 extends Model {}
    class _Collection extends Collection {
      static model = _Model
    }

    collection = new Collection([{id: 1}]).clone();
    expect(collection.at(0)).toBeInstanceOf(Model);

    collection = new _Collection([{id: 1}]).clone();
    collection.add({id: 2});
    expect(collection.at(0)).toBeInstanceOf(_Model);
    expect(collection.at(1)).toBeInstanceOf(_Model);

    collection = new Collection([{id: 1}], {model: _Model2}).clone();
    expect(collection.at(0)).toBeInstanceOf(_Model2);
  });

  test('get', () => {
    expect(col.get(0)).toEqual(d);
    expect(col.get(d.clone())).toEqual(d);
    expect(col.get(2)).toEqual(b);
    expect(col.get({id: 1})).toEqual(c);
    expect(col.get(c.clone())).toEqual(c);
    expect(col.get(col.at(0).cid)).toEqual(col.at(0));
  });

  test('get with non-default ids', () => {
    var model,
        collection;

    class MongoModel extends Model {
      static idAttribute = '_id'
    }

    model = new MongoModel({_id: 100});
    collection = new Collection([model], {model: MongoModel});

    expect(collection.get(100)).toEqual(model);
    expect(collection.get(model.cid)).toEqual(model);
    expect(collection.get(model)).toEqual(model);
    expect(collection.get(101)).not.toBeDefined();

    collection = new Collection();
    collection.model = MongoModel;
    collection.add(model.attributes);
    expect(collection.get(model.clone())).toEqual(collection.at(0));
  });

  test('has', () => {
    var outsider = new Model({id: 4});

    expect(col.has(a)).toBe(true);
    expect(col.has(b)).toBe(true);
    expect(col.has(c)).toBe(true);
    expect(col.has(d)).toBe(true);
    expect(col.has(a.id)).toBe(true);
    expect(col.has(b.id)).toBe(true);
    expect(col.has(c.id)).toBe(true);
    expect(col.has(d.id)).toBe(true);
    expect(col.has(a.cid)).toBe(true);
    expect(col.has(b.cid)).toBe(true);
    expect(col.has(c.cid)).toBe(true);
    expect(col.has(d.cid)).toBe(true);

    expect(col.has(outsider)).toBe(false);
    expect(col.has(outsider.id)).toBe(false);
    expect(col.has(outsider.cid)).toBe(false);
  });

  test('update index when id changes', () => {
    var collection = new Collection(),
        one;

    collection.add([{id: 0, name: 'one'}, {id: 1, name: 'two'}]);

    one = collection.get(0);
    expect(one.get('name')).toEqual('one');
    collection.on('change:name', function(model) {
      expect(!!this.get(model)).toBe(true);
    });

    one.set({name: 'dalmatians', id: 101});
    expect(collection.get(0)).not.toBeDefined();
    expect(collection.get(101).get('name')).toEqual('dalmatians');
  });

  test('at', () => {
    expect(col.at(2)).toEqual(c);
    expect(col.at(-2)).toEqual(c);
  });

  test('pluck', () => {
    expect(col.pluck('label').join(' ')).toEqual('a b c d');
  });

  test('add', () => {
    var added = null,
        opts = null,
        addSpy = jest.fn(),
        e = new Model({id: 10, label: 'e'}),
        otherCol = new Collection(),

        f = new Model({id: 20, label: 'f'}),
        g = new Model({id: 21, label: 'g'}),
        h = new Model({id: 22, label: 'h'}),
        atCol = new Collection([f, g, h]),
        coll = new Collection(Array.from({length: 2}));

    otherCol.add(e);
    otherCol.on('add', addSpy);
    col.on('add', (model, collection, options) => {
      added = model.get('label');
      opts = options;
    });
    col.add(e, {amazing: true});
    expect(added).toEqual('e');
    expect(col.length).toEqual(5);
    expect(col.at(col.length - 1)).toEqual(e);
    expect(otherCol.length).toEqual(1);
    expect(addSpy).not.toHaveBeenCalled();
    expect(opts.amazing).toBe(true);

    expect(atCol.length).toEqual(3);
    atCol.add(e, {at: 1});
    expect(atCol.length).toEqual(4);
    expect(atCol.at(1)).toEqual(e);
    expect(atCol.at(atCol.length - 1)).toEqual(h);

    addSpy.mockClear();

    coll.on('add', addSpy);
    coll.add([undefined, f, g]);
    expect(coll.length).toEqual(5);
    expect(addSpy).toHaveBeenCalledTimes(3);
    coll.add(Array.from({length: 4}));
    expect(coll.length).toEqual(9);
    expect(addSpy).toHaveBeenCalledTimes(7);
  });

  test('add multiple models', () => {
    var collection = new Collection([{at: 0}, {at: 1}, {at: 9}]);

    collection.add([{at: 2}, {at: 3}, {at: 4}, {at: 5}, {at: 6}, {at: 7}, {at: 8}], {at: 2});

    for (let i = 0; i <= 5; i++) {
      expect(collection.at(i).get('at')).toEqual(i);
    }
  });

  test('add; at should have preference over comparator', () => {
    var collection;

    class Col extends Collection {
      static comparator = (m1, m2) => m1.id > m2.id ? -1 : 1
    }

    collection = new Col([{id: 2}, {id: 3}]);
    collection.add(new Model({id: 1}), {at: 1});

    expect(collection.pluck('id').join(' ')).toEqual('3 1 2');
  });

  test('add; at should add to the end if the index is out of bounds', () => {
    var collection = new Collection([{id: 2}, {id: 3}]);

    collection.add(new Model({id: 1}), {at: 5});
    expect(collection.pluck('id').join(' ')).toEqual('2 3 1');
  });

  test('can\'t add model to collection twice', () => {
    var collection = new Collection([{id: 1}, {id: 2}, {id: 1}, {id: 2}, {id: 3}]);

    expect(collection.pluck('id').join(' ')).toEqual('1 2 3');
  });

  test('can\'t add different model with same id to collection twice', () => {
    var collection = new Collection;

    collection.unshift({id: 101});
    collection.add({id: 101});
    expect(collection.length).toEqual(1);
  });

  test('merge in duplicate models with {merge: true}', () => {
    var collection = new Collection;

    collection.add([{id: 1, name: 'Moe'}, {id: 2, name: 'Curly'}, {id: 3, name: 'Larry'}]);
    collection.add({id: 1, name: 'Moses'});
    expect(collection.at(0).get('name')).toEqual('Moe');

    collection.add({id: 1, name: 'Moses'}, {merge: true});
    expect(collection.at(0).get('name')).toEqual('Moses');

    collection.add({id: 1, name: 'Tim'}, {merge: true, silent: true});
    expect(collection.at(0).get('name')).toEqual('Tim');
  });

  test('add model to multiple collections', () => {
    var counter = 0,
        m = new Model({id: 10, label: 'm'}),
        col1,
        col2;

    m.on('add', (model, collection) => {
      counter++;
      expect(m).toEqual(model);

      if (counter > 1) {
        expect(collection).toEqual(col2);
      } else {
        expect(collection).toEqual(col1);
      }
    });

    col1 = new Collection([]);
    col1.on('add', (model, collection) => {
      expect(m).toEqual(model);
      expect(col1).toEqual(collection);
    });

    col2 = new Collection([]);
    col2.on('add', (model, collection) => {
      expect(m).toEqual(model);
      expect(col2).toEqual(collection);
    });
    col1.add(m);
    expect(m.collection).toEqual(col1);
    col2.add(m);
    expect(m.collection).toEqual(col1);
  });

  test('add model with parse', () => {
    var collection;

    class _Model extends Model {
      parse(obj) {
        obj.value += 1;

        return obj;
      }
    }

    class Col extends Collection {
      static model = _Model
    }

    collection = new Col;
    collection.add({value: 1}, {parse: true});
    expect(collection.at(0).get('value')).toEqual(2);
  });

  test('add with parse and merge', () => {
    var collection = new Collection();

    collection.parse = function(attrs) {
      return Object.values(attrs).map((val) => val.model || val);
    };

    collection.add({id: 1});
    collection.add({model: {id: 1, name: 'Alf'}}, {parse: true, merge: true});
    expect(collection.at(0).get('name')).toEqual('Alf');
  });

  test('add model to collection with sort()-style comparator', () => {
    var collection = new Collection(
          [],
          {comparator: (m1, m2) => m1.get('name') < m2.get('name') ? -1 : 1}
        ),
        tom = new Model({name: 'Tom'}),
        rob = new Model({name: 'Rob'}),
        tim = new Model({name: 'Tim'});

    collection.add(tom);
    collection.add(rob);
    collection.add(tim);
    expect(collection.models.indexOf(rob)).toEqual(0);
    expect(collection.models.indexOf(tim)).toEqual(1);
    expect(collection.models.indexOf(tom)).toEqual(2);
  });

  test('comparator that depends on `this`', () => {
    var collection = new Collection;

    collection.negative = (num) => -num;

    collection.comparator = function(model) {
      return this.negative(model.id);
    };

    collection.add([{id: 1}, {id: 2}, {id: 3}]);
    expect(collection.pluck('id')).toEqual([3, 2, 1]);

    collection.comparator = function(m1, m2) {
      return this.negative(m2.id) - this.negative(m1.id);
    };

    collection.sort();
    expect(collection.pluck('id')).toEqual([1, 2, 3]);
  });

  test('remove', () => {
    var removed = null,
        result = null;

    col.on('remove', (model, collection, options) => {
      removed = model.get('label');
      expect(options.index).toEqual(3);
      expect(collection.get(model)).not.toBeDefined();
    });

    result = col.remove(d);
    expect(removed).toEqual('d');
    expect(result).toEqual(d);

    // if we try to remove d again, it's not going to actually get removed
    result = col.remove(d);
    expect(result).not.toBeDefined();
    expect(col.length).toEqual(3);
    expect(col.at(0)).toEqual(a);
    col.off();
    result = col.remove([c, d]);
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(c);
    result = col.remove([c, b]);
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(b);
    result = col.remove([]);
    expect(result).toEqual([]);
  });

  test('add and remove return values', () => {
    var collection = new Collection,
        list,
        result;

    class Even extends Model {
      validate(attrs) {
        if (attrs.id % 2 !== 0) {
          return 'odd';
        }
      }
    }

    collection.model = Even;

    list = collection.add([{id: 2}, {id: 4}], {validate: true});
    expect(list.length).toEqual(2);
    expect(list[0]).toBeInstanceOf(Model);
    expect(list[1]).toEqual(collection.at(collection.length - 1));
    expect(list[1].get('id')).toEqual(4);

    list = collection.add([{id: 3}, {id: 6}], {validate: true});
    expect(collection.length).toEqual(3);
    expect(list[0]).toBe(false);
    expect(list[1].get('id')).toEqual(6);

    result = collection.add({id: 6});
    expect(result.cid).toEqual(list[1].cid);

    result = collection.remove({id: 6});
    expect(collection.length).toEqual(2);
    expect(result.id).toEqual(6);

    list = collection.remove([{id: 2}, {id: 8}]);
    expect(collection.length).toEqual(1);
    expect(list[0].get('id')).toEqual(2);
    expect(list[1]).not.toBeDefined();
  });

  test('shift and pop', () => {
    var collection = new Collection([{a: 'a'}, {b: 'b'}, {c: 'c'}]);

    expect(collection.shift().get('a')).toEqual('a');
    expect(collection.pop().get('c')).toEqual('c');
  });

  test('slice', () => {
    var collection = new Collection([{a: 'a'}, {b: 'b'}, {c: 'c'}]),
        array = collection.slice(1, 3);

    expect(array.length).toEqual(2);
    expect(array[0].get('b')).toEqual('b');
  });

  test('events are unbound on remove', () => {
    var dj = new Model(),
        emcees = new Collection([dj]),
        changeSpy = jest.fn();

    emcees.on('change', changeSpy);
    dj.set({name: 'Kool'});
    expect(changeSpy).toHaveBeenCalledTimes(1);
    emcees.reset([]);
    expect(dj.collection).not.toBeDefined();
    dj.set({name: 'Shadow'});
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });

  test('remove in multiple collections', () => {
    var modelData = {
          id: 5,
          title: 'Othello'
        },
        removeSpy = jest.fn(),
        m1 = new Model(modelData),
        m2 = new Model(modelData),
        col1 = new Collection([m1]),
        col2 = new Collection([m2]);

    m2.on('remove', removeSpy);
    expect(m1).not.toEqual(m2);
    expect(col1.length).toEqual(1);
    expect(col2.length).toEqual(1);

    col1.remove(m1);
    expect(removeSpy).not.toHaveBeenCalled();
    expect(col1.length).toEqual(0);

    col2.remove(m1);
    expect(col2.length).toEqual(0);
    expect(removeSpy).toHaveBeenCalled();
  });

  test('remove same model in multiple collection', () => {
    var counter = 0,
        m = new Model({id: 5, title: 'Othello'}),
        col1 = new Collection([m]),
        col2 = new Collection([m]);

    m.on('remove', (model, collection) => {
      counter++;
      expect(m).toEqual(model);

      if (counter > 1) {
        expect(collection).toEqual(col1);
      } else {
        expect(collection).toEqual(col2);
      }
    });

    col1.on('remove', (model, collection) => {
      expect(m).toEqual(model);
      expect(col1).toEqual(collection);
    });
    col2.on('remove', (model, collection) => {
      expect(m).toEqual(model);
      expect(col2).toEqual(collection);
    });
    expect(col1).toEqual(m.collection);
    col2.remove(m);
    expect(col2.length).toEqual(0);
    expect(col1.length).toEqual(1);
    expect(counter).toEqual(1);
    expect(col1).toEqual(m.collection);
    col1.remove(m);
    expect(m.collection).not.toBeDefined();
    expect(col1.length).toEqual(0);
    expect(counter).toEqual(2);
  });

  test('model destroy removes from all collections', () => {
    var m = new Model({id: 5, title: 'Othello'}),
        col1 = new Collection([m]),
        col2 = new Collection([m]);

    m.sync = (method, model, options) => options.success();
    m.destroy();

    expect(col1.length).toEqual(0);
    expect(col2.length).toEqual(0);
    expect(m.collection).not.toBeDefined();
  });

  test('Collection: non-persisted model destroy removes from all collections', () => {
    var m = new Model({title: 'Othello'}),
        col1 = new Collection([m]),
        col2 = new Collection([m]);

    m.sync = jest.fn();
    m.destroy();
    expect(col1.length).toEqual(0);
    expect(col2.length).toEqual(0);
    expect(m.collection).not.toBeDefined();
    expect(m.sync).not.toHaveBeenCalled();
  });

  test('fetch', async() => {
    var collection = new Collection;

    collection.url = '/test';
    await collection.fetch();

    expect(Collection.prototype.sync).toHaveBeenCalled();
    expect(Collection.prototype.sync.mock.calls[0][0]).toEqual('read');
    expect(Collection.prototype.sync.mock.calls[0][1]).toEqual(collection);
    expect(Collection.prototype.sync.mock.calls[0][2].parse).toBe(true);

    collection.fetch({parse: false});
    expect(Collection.prototype.sync.mock.calls[1][2].parse).toBe(false);
  });

  test('fetch with an error response triggers an error event', async() => {
    var collection = new Collection(),
        errorSpy = jest.fn();

    collection.on('error', errorSpy);
    collection.sync = (method, model, options) => options.error();

    await collection.fetch().catch(() => {});
    expect(errorSpy).toHaveBeenCalled();
  });

  test('#3283 - fetch with an error response calls error with context', async() => {
    var collection = new Collection(),
        obj = {},
        options = {
          context: obj,
          error: function() {
            expect(this).toEqual(obj);
          }
        };

    collection.sync = (method, model, opts) => opts.error.call(opts.context);
    await collection.fetch(options).catch(() => {});
  });

  test('fetch returns a promise that resolves an array of model and response', async() => {
    var collection = new Collection(),
        result;

    collection.sync = (method, model, options) => Promise.resolve('resolved').then(options.success);
    result = await collection.fetch();

    expect(result[0]).toEqual(collection);
    expect(result[1]).toEqual('resolved');

    collection.sync = (_method, _model, _options) => Promise.reject('rejected')
        .catch(_options.error);

    result = await collection.fetch().catch((resp) => resp);
    expect(result[0]).toEqual(collection);
    expect(result[1]).toEqual('rejected');
  });

  test('fetch calls a success response if passed', async() => {
    var successSpy = jest.fn(),
        collection = new Collection(),
        options = {success: successSpy};

    collection.url = '/foo';
    await collection.fetch(options);
    expect(successSpy).toHaveBeenCalled();

    successSpy.mockClear();

    await collection.fetch().then(successSpy);
    expect(successSpy).toHaveBeenCalled();
  });

  test('fetch calls a complete response if passed', async() => {
    var completeSpy = jest.fn(),
        collection = new Collection(),
        options = {complete: completeSpy};

    collection.url = '/foo';

    await collection.fetch(options);
    expect(completeSpy).toHaveBeenCalled();

    window.fetch.mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 400})
    ));

    await collection.fetch(options).catch(() => {});
    expect(completeSpy).toHaveBeenCalledTimes(2);
  });

  test('ensure fetch only parses once', async() => {
    var collection = new Collection,
        parseSpy = jest.fn();

    collection.parse = (models) => {
      parseSpy();

      return models;
    };

    collection.url = '/test';
    await collection.fetch();

    expect(parseSpy).toHaveBeenCalledTimes(1);
  });

  test('create', async() => {
    var collection = new Collection,
        model;

    jest.spyOn(Model.prototype, 'sync');
    collection.url = '/test';
    await collection.create({label: 'f'});

    model = collection.at(0);
    expect(Model.prototype.sync.mock.calls[0][0]).toEqual('create');
    expect(Model.prototype.sync.mock.calls[0][1]).toEqual(model);
    expect(model.get('label')).toEqual('f');
    expect(model.collection).toEqual(collection);
  });

  test('create with validate:true enforces validation', () => {
    var collection;

    class ValidatingModel extends Model {
      validate(attrs) {
        return 'fail';
      }
    }

    class ValidatingCollection extends Collection {
      static model = ValidatingModel
    }

    collection = new ValidatingCollection();
    collection.on('invalid', (coll, error, options) => {
      expect(error).toEqual('fail');
    });
    expect(collection.create({foo: 'bar'}, {validate: true})).toBe(false);
  });

  test('create will pass extra options to success callback', async() => {
    var collection,
        success;

    class _Model extends Model {
      sync(method, model, options) {
        Object.assign(options, {specialSync: true});

        return Model.prototype.sync.call(this, method, model, options);
      }
    }

    class _Collection extends Collection {
      url = '/test'

      static model = _Model
    }

    collection = new _Collection;

    success = (model, response, options) => {
      expect(options.specialSync).toBe(true);
    };

    await collection.create({}, {success});
  });

  test('create with wait:true should not call collection.parse', async() => {
    var collection,
        parseSpy = jest.fn();

    class _Collection extends Collection {
      url = '/test'

      parse = parseSpy
    }

    collection = new _Collection;
    await collection.create({}, {wait: true});
    expect(parseSpy).not.toHaveBeenCalled();
  });

  test('a failing create returns model with errors', () => {
    var collection,
        m;

    class ValidatingModel extends Model {
      validate(attrs) {
        return 'fail';
      }
    }

    class ValidatingCollection extends Collection {
      static model = ValidatingModel
    }

    collection = new ValidatingCollection();
    collection.create({foo: 'bar'});
    m = collection.findWhere({foo: 'bar'});
    expect(m.validationError).toEqual('fail');
    expect(collection.length).toEqual(1);
  });

  test('create with an error response calls error with context', async() => {
    var collection = new Collection(),
        errorSpy = jest.fn(),
        obj = {},
        options = {
          context: obj,
          error() {
            errorSpy();
            expect(this).toEqual(obj);
          }
        };

    collection.url = '/foo';
    window.fetch.mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 400})
    ));
    await collection.create({}, options).catch(() => {});
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockClear();
    await collection.create({}, options).catch(errorSpy);
    expect(errorSpy).toHaveBeenCalled();
  });

  test('create with an success response calls success with context', async() => {
    var collection = new Collection(),
        successSpy = jest.fn(),
        obj = {},
        options = {
          context: obj,
          success() {
            successSpy();
            expect(this).toEqual(obj);
          }
        };

    collection.url = '/foo';
    await collection.create({}, options);
    expect(successSpy).toHaveBeenCalled();

    successSpy.mockClear();
    await collection.create({}).then(successSpy);
    expect(successSpy).toHaveBeenCalled();
  });

  test('create returns a promise that resolves an array of model and response', async() => {
    var model = new Model({id: 'foo'}),
        collection = new Collection(),
        model2 = new Model({id: 'bar'}),
        result;

    collection.url = '/foo';
    result = await collection.create(model);
    expect(result[0]).toEqual(model);
    expect(result[1]).toEqual({});

    collection.sync = (_method, _model, _options) => Promise.reject('rejected');
    result = await collection.create(model2).catch((resp) => resp);
    expect(result[0]).toEqual(model2);
    expect(result[1]).toEqual({});
  });

  test('create calls a complete response if passed', async() => {
    var collection = new Collection(),
        completeSpy = jest.fn(),
        options = {complete: completeSpy};

    collection.url = '/foo';
    await collection.create({}, options);
    expect(completeSpy).toHaveBeenCalled();
    completeSpy.mockClear();

    window.fetch.mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 400})
    ));

    await collection.create({}, options).catch(() => {});
    expect(completeSpy).toHaveBeenCalled();
  });

  test('initialize', () => {
    class _Collection extends Collection {
      initialize() {
        this.one = 1;
      }
    }

    expect((new _Collection()).one).toEqual(1);
  });

  test('preinitialize', () => {
    class _Collection extends Collection {
      preinitialize() {
        this.one = 1;
      }
    }

    expect((new _Collection()).one).toEqual(1);
  });

  test('preinitialize occurs before the collection is set up', () => {
    var coll;

    class FooModel extends Model {}

    class _Collection extends Collection {
      preinitialize() {
        expect(this.model).not.toEqual(FooModel);
      }
    }

    coll = new _Collection({}, {model: FooModel});
    expect(coll.model).toEqual(FooModel);
  });

  test('toJSON', () => {
    expect(JSON.stringify(col)).toEqual(
      '[{"id":3,"label":"a"},{"id":2,"label":"b"},{"id":1,"label":"c"},{"id":0,"label":"d"}]'
    );
  });

  test('where and findWhere', () => {
    var model = new Model({a: 1}),
        coll = new Collection([model, {a: 1}, {a: 1, b: 2}, {a: 2, b: 2}, {a: 3}]);

    expect(coll.where({a: 1}).length).toEqual(3);
    expect(coll.where({a: 2}).length).toEqual(1);
    expect(coll.where({a: 3}).length).toEqual(1);
    expect(coll.where({b: 1}).length).toEqual(0);
    expect(coll.where({b: 2}).length).toEqual(2);
    expect(coll.where({a: 1, b: 2}).length).toEqual(1);
    expect(coll.findWhere({a: 1})).toEqual(model);
    expect(coll.findWhere({a: 4})).not.toBeDefined();
  });

  test('reset', () => {
    var resetSpy = jest.fn(),
        models = col.models,
        f;

    col.on('reset', resetSpy);
    col.reset([]);
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(col.length).toEqual(0);
    expect(col.at(col.length - 1)).not.toBeDefined();

    col.reset(models);
    expect(resetSpy).toHaveBeenCalledTimes(2);
    expect(col.length).toEqual(4);
    expect(col.at(col.length - 1)).toEqual(d);

    col.reset(models.map(({attributes}) => attributes));
    expect(resetSpy).toHaveBeenCalledTimes(3);
    expect(col.length).toEqual(4);
    expect(col.at(col.length - 1)).not.toEqual(d);
    expect(col.at(col.length - 1).attributes).toEqual(d.attributes);

    col.reset();
    expect(col.length).toEqual(0);
    expect(resetSpy).toHaveBeenCalledTimes(4);

    f = new Model({id: 20, label: 'f'});
    col.reset([undefined, f]);
    expect(col.length).toEqual(2);
    expect(resetSpy).toHaveBeenCalledTimes(5);

    col.reset(Array.from({length: 4}));
    expect(col.length).toEqual(4);
    expect(resetSpy).toHaveBeenCalledTimes(6);
  });

  test('reset with different values', () => {
    var collection = new Collection({id: 1});

    collection.reset({id: 1, a: 1});
    expect(collection.get(1).get('a')).toEqual(1);
  });

  test('same references in reset', () => {
    var model = new Model({id: 1}),
        collection = new Collection({id: 1});

    collection.reset(model);
    expect(collection.get(1)).toEqual(model);
  });

  test('reset passes caller options', () => {
    var collection;

    class _Model extends Model {
      initialize(attrs, options) {
        this.modelParameter = options.modelParameter;
      }
    }

    class _Collection extends Collection {
      static model = _Model
    }

    collection = new _Collection;

    collection.reset([
      {astring: 'green', anumber: 1},
      {astring: 'blue', anumber: 2}
    ], {modelParameter: 'model parameter'});

    expect(collection.length).toEqual(2);
    collection.models.forEach((model) => {
      expect(model.modelParameter).toEqual('model parameter');
    });
  });

  test('reset does not alter options by reference', () => {
    var collection = new Collection([{id: 1}]),
        origOpts = {};

    collection.on('reset', (coll, opts) => {
      expect(origOpts.previousModels).not.toBeDefined();
      expect(opts.previousModels[0].id).toEqual(1);
    });
    collection.reset([], origOpts);
  });

  test('trigger custom events on models', () => {
    var customSpy = jest.fn();

    a.on('custom', customSpy);
    a.trigger('custom');
    expect(customSpy).toHaveBeenCalled();
  });

  test('add does not alter arguments', () => {
    var attrs = {},
        models = [attrs];

    new Collection().add(models);
    expect(models.length).toEqual(1);
    expect(attrs).toEqual(models[0]);
  });

  test('#714: access `model.collection` in a brand new model.', async() => {
    var collection = new Collection;

    class _Model extends Model {
      set(attrs) {
        expect(attrs.prop).toEqual('value');
        expect(this.collection).toEqual(collection);

        return this;
      }
    }

    collection.model = _Model;
    collection.url = '/test';

    collection.sync = () => {};

    collection.create({prop: 'value'}).catch(() => {});
  });

  test('#574, remove its own reference to the .models array.', () => {
    var collection = new Collection([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}]);

    expect(collection.length).toEqual(6);
    collection.remove(collection.models);
    expect(collection.length).toEqual(0);
  });

  /*
  test('#861, adding models to a collection which do not pass validation, with ' +
      'validate:true', () => {
    assert.expect(2);
    var Model = Schmackbone.Model.extend({
      validate: function(attrs) {
        if (attrs.id === 3) return "id can't be 3";
      }
    });

    var Collection = Schmackbone.Collection.extend({
      model: Model
    });

    var collection = new Collection;
    collection.on('invalid', function() { assert.ok(true); });

    collection.add([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}], {validate: true});
    assert.deepEqual(collection.pluck('id'), [1, 2, 4, 5, 6]);
  });

  test('Invalid models are discarded with validate:true.', () => {
    assert.expect(5);
    var collection = new Schmackbone.Collection;
    collection.on('test', function() { assert.ok(true); });
    collection.model = Schmackbone.Model.extend({
      validate: function(attrs){ if (!attrs.valid) return 'invalid'; }
    });
    var model = new collection.model({id: 1, valid: true});
    collection.add([model, {id: 2}], {validate: true});
    model.trigger('test');
    assert.ok(collection.get(model.cid));
    assert.ok(collection.get(1));
    assert.ok(!collection.get(2));
    assert.equal(collection.length, 1);
  });

  test('multiple copies of the same model', () => {
    assert.expect(3);
    var collection = new Schmackbone.Collection();
    var model = new Schmackbone.Model();
    collection.add([model, model]);
    assert.equal(collection.length, 1);
    collection.add([{id: 1}, {id: 1}]);
    assert.equal(collection.length, 2);
    assert.equal(collection.last().id, 1);
  });

  test('#964 - collection.get return inconsistent', () => {
    assert.expect(2);
    var collection = new Schmackbone.Collection();
    assert.ok(collection.get(null) === undefined);
    assert.ok(collection.get() === undefined);
  });

  test('#1112 - passing options.model sets collection.model', () => {
    assert.expect(2);
    var Model = Schmackbone.Model.extend({});
    var collection = new Schmackbone.Collection([{id: 1}], {model: Model});
    assert.ok(collection.model === Model);
    assert.ok(collection.at(0) instanceof Model);
  });

  test('null and undefined are invalid ids.', () => {
    assert.expect(2);
    var model = new Schmackbone.Model({id: 1});
    var collection = new Schmackbone.Collection([model]);
    model.set({id: null});
    assert.ok(!collection.get('null'));
    model.set({id: 1});
    model.set({id: undefined});
    assert.ok(!collection.get('undefined'));
  });

  test('falsy comparator', () => {
    assert.expect(4);
    var Col = Schmackbone.Collection.extend({
      comparator: function(model){ return model.id; }
    });
    var collection = new Col();
    var colFalse = new Col(null, {comparator: false});
    var colNull = new Col(null, {comparator: null});
    var colUndefined = new Col(null, {comparator: undefined});
    assert.ok(collection.comparator);
    assert.ok(!colFalse.comparator);
    assert.ok(!colNull.comparator);
    assert.ok(colUndefined.comparator);
  });

  test('#1355 - `options` is passed to success callbacks', () => {
    assert.expect(2);
    var m = new Schmackbone.Model({x: 1});
    var collection = new Schmackbone.Collection();
    var opts = {
      opts: true,
      success: function(coll, resp, options) {
        assert.ok(options.opts);
      }
    };
    collection.sync = m.sync = function( method, coll, options ){
      options.success({});
    };
    collection.fetch(opts);
    collection.create(m, opts);
  });

  test("#1412 - Trigger 'request' and 'sync' events.", () => {
    assert.expect(4);
    var collection = new Schmackbone.Collection;
    collection.url = '/test';
    Schmackbone.ajax = function(settings){ settings.success(); };

    collection.on('request', function(obj, xhr, options) {
      assert.ok(obj === collection, "collection has correct 'request' event after fetching");
    });
    collection.on('sync', function(obj, response, options) {
      assert.ok(obj === collection, "collection has correct 'sync' event after fetching");
    });
    collection.fetch();
    collection.off();

    collection.on('request', function(obj, xhr, options) {
      expect(obj).toEqual(collection.get(1));
    });
    collection.on('sync', function(obj, response, options) {
      expect(obj).toEqual(collection.get(1));
    });
    collection.create({id: 1});
    collection.off();
  });

  test('#3283 - fetch, create calls success with context', () => {
    assert.expect(2);
    var collection = new Schmackbone.Collection;
    collection.url = '/test';
    Schmackbone.ajax = function(settings) {
      settings.success.call(settings.context);
    };
    var obj = {};
    var options = {
      context: obj,
      success: function() {
        assert.equal(this, obj);
      }
    };

    collection.fetch(options);
    collection.create({id: 1}, options);
  });

  test('#1447 - create with wait adds model.', () => {
    assert.expect(1);
    var collection = new Schmackbone.Collection;
    var model = new Schmackbone.Model;
    model.sync = function(method, m, options){ options.success(); };
    collection.on('add', function(){ assert.ok(true); });
    collection.create(model, {wait: true});
  });

  test('#1448 - add sorts collection after merge.', () => {
    assert.expect(1);
    var collection = new Schmackbone.Collection([
      {id: 1, x: 1},
      {id: 2, x: 2}
    ]);
    collection.comparator = function(model){ return model.get('x'); };
    collection.add({id: 1, x: 3}, {merge: true});
    assert.deepEqual(collection.pluck('id'), [2, 1]);
  });

  test('#1655 - groupBy can be used with a string argument.', () => {
    assert.expect(3);
    var collection = new Schmackbone.Collection([{x: 1}, {x: 2}]);
    var grouped = collection.groupBy('x');
    assert.strictEqual(_.keys(grouped).length, 2);
    assert.strictEqual(grouped[1][0].get('x'), 1);
    assert.strictEqual(grouped[2][0].get('x'), 2);
  });

  test('#1655 - sortBy can be used with a string argument.', () => {
    assert.expect(1);
    var collection = new Schmackbone.Collection([{x: 3}, {x: 1}, {x: 2}]);
    var values = _.map(collection.sortBy('x'), function(model) {
      return model.get('x');
    });
    assert.deepEqual(values, [1, 2, 3]);
  });

  test('#1604 - Removal during iteration.', () => {
    assert.expect(0);
    var collection = new Schmackbone.Collection([{}, {}]);
    collection.on('add', function() {
      collection.at(0).destroy();
    });
    collection.add({}, {at: 0});
  });

  test('#1638 - `sort` during `add` triggers correctly.', () => {
    var collection = new Schmackbone.Collection;
    collection.comparator = function(model) { return model.get('x'); };
    var added = [];
    collection.on('add', function(model) {
      model.set({x: 3});
      collection.sort();
      added.push(model.id);
    });
    collection.add([{id: 1, x: 1}, {id: 2, x: 2}]);
    assert.deepEqual(added, [1, 2]);
  });

  test('fetch parses models by default', () => {
    assert.expect(1);
    var model = {};
    var Collection = Schmackbone.Collection.extend({
      url: 'test',
      model: Schmackbone.Model.extend({
        parse: function(resp) {
          assert.strictEqual(resp, model);
        }
      })
    });
    new Collection().fetch();
    this.ajaxSettings.success([model]);
  });

  test("`sort` shouldn't always fire on `add`", () => {
    assert.expect(1);
    var collection = new Schmackbone.Collection([{id: 1}, {id: 2}, {id: 3}], {
      comparator: 'id'
    });
    collection.sort = function(){ assert.ok(true); };
    collection.add([]);
    collection.add({id: 1});
    collection.add([{id: 2}, {id: 3}]);
    collection.add({id: 4});
  });

  test('#1407 parse option on constructor parses collection and models', () => {
    assert.expect(2);
    var model = {
      namespace: [{id: 1}, {id: 2}]
    };
    var Collection = Schmackbone.Collection.extend({
      model: Schmackbone.Model.extend({
        parse: function(m) {
          m.name = 'test';
          return m;
        }
      }),
      parse: function(m) {
        return m.namespace;
      }
    });
    var collection = new Collection(model, {parse: true});

    assert.equal(collection.length, 2);
    assert.equal(collection.at(0).get('name'), 'test');
  });

  test('#1407 parse option on reset parses collection and models', () => {
    assert.expect(2);
    var model = {
      namespace: [{id: 1}, {id: 2}]
    };
    var Collection = Schmackbone.Collection.extend({
      model: Schmackbone.Model.extend({
        parse: function(m) {
          m.name = 'test';
          return m;
        }
      }),
      parse: function(m) {
        return m.namespace;
      }
    });
    var collection = new Collection();
    collection.reset(model, {parse: true});

    assert.equal(collection.length, 2);
    assert.equal(collection.at(0).get('name'), 'test');
  });

  test('Reset includes previous models in triggered event.', () => {
    assert.expect(1);
    var model = new Schmackbone.Model();
    var collection = new Schmackbone.Collection([model]);
    collection.on('reset', function(coll, options) {
      assert.deepEqual(options.previousModels, [model]);
    });
    collection.reset([]);
  });

  test('set', () => {
    var m1 = new Schmackbone.Model();
    var m2 = new Schmackbone.Model({id: 2});
    var m3 = new Schmackbone.Model();
    var collection = new Schmackbone.Collection([m1, m2]);

    // Test add/change/remove events
    collection.on('add', function(model) {
      assert.strictEqual(model, m3);
    });
    collection.on('change', function(model) {
      assert.strictEqual(model, m2);
    });
    collection.on('remove', function(model) {
      assert.strictEqual(model, m1);
    });

    // remove: false doesn't remove any models
    collection.set([], {remove: false});
    assert.strictEqual(collection.length, 2);

    // add: false doesn't add any models
    collection.set([m1, m2, m3], {add: false});
    assert.strictEqual(collection.length, 2);

    // merge: false doesn't change any models
    collection.set([m1, {id: 2, a: 1}], {merge: false});
    assert.strictEqual(m2.get('a'), void 0);

    // add: false, remove: false only merges existing models
    collection.set([m1, {id: 2, a: 0}, m3, {id: 4}], {add: false, remove: false});
    assert.strictEqual(collection.length, 2);
    assert.strictEqual(m2.get('a'), 0);

    // default options add/remove/merge as appropriate
    collection.set([{id: 2, a: 1}, m3]);
    assert.strictEqual(collection.length, 2);
    assert.strictEqual(m2.get('a'), 1);

    // Test removing models not passing an argument
    collection.off('remove').on('remove', function(model) {
      assert.ok(model === m2 || model === m3);
    });
    collection.set([]);
    assert.strictEqual(collection.length, 0);

    // Test null models on set doesn't clear collection
    collection.off();
    collection.set([{id: 1}]);
    collection.set();
    assert.strictEqual(collection.length, 1);
  });

  test('set with only cids', () => {
    assert.expect(3);
    var m1 = new Schmackbone.Model;
    var m2 = new Schmackbone.Model;
    var collection = new Schmackbone.Collection;
    collection.set([m1, m2]);
    assert.equal(collection.length, 2);
    collection.set([m1]);
    assert.equal(collection.length, 1);
    collection.set([m1, m1, m1, m2, m2], {remove: false});
    assert.equal(collection.length, 2);
  });

  test('set with only idAttribute', () => {
    assert.expect(3);
    var m1 = {_id: 1};
    var m2 = {_id: 2};
    var Col = Schmackbone.Collection.extend({
      model: Schmackbone.Model.extend({
        idAttribute: '_id'
      })
    });
    var collection = new Col;
    collection.set([m1, m2]);
    assert.equal(collection.length, 2);
    collection.set([m1]);
    assert.equal(collection.length, 1);
    collection.set([m1, m1, m1, m2, m2], {remove: false});
    assert.equal(collection.length, 2);
  });

  test('set + merge with default values defined', () => {
    var Model = Schmackbone.Model.extend({
      defaults: {
        key: 'value'
      }
    });
    var m = new Model({id: 1});
    var collection = new Schmackbone.Collection([m], {model: Model});
    assert.equal(collection.first().get('key'), 'value');

    collection.set({id: 1, key: 'other'});
    assert.equal(collection.first().get('key'), 'other');

    collection.set({id: 1, other: 'value'});
    assert.equal(collection.first().get('key'), 'other');
    assert.equal(collection.length, 1);
  });

  test('merge without mutation', () => {
    var Model = Schmackbone.Model.extend({
      initialize: function(attrs, options) {
        if (attrs.child) {
          this.set('child', new Model(attrs.child, options), options);
        }
      }
    });
    var Collection = Schmackbone.Collection.extend({model: Model});
    var data = [{id: 1, child: {id: 2}}];
    var collection = new Collection(data);
    assert.equal(collection.first().id, 1);
    collection.set(data);
    assert.equal(collection.first().id, 1);
    collection.set([{id: 2, child: {id: 2}}].concat(data));
    assert.deepEqual(collection.pluck('id'), [2, 1]);
  });

  test('`set` and model level `parse`', () => {
    var Model = Schmackbone.Model.extend({});
    var Collection = Schmackbone.Collection.extend({
      model: Model,
      parse: function(res) { return _.map(res.models, 'model'); }
    });
    var model = new Model({id: 1});
    var collection = new Collection(model);
    collection.set({models: [
      {model: {id: 1}},
      {model: {id: 2}}
    ]}, {parse: true});
    assert.equal(collection.first(), model);
  });

  test('`set` data is only parsed once', () => {
    var collection = new Schmackbone.Collection();
    collection.model = Schmackbone.Model.extend({
      parse: function(data) {
        assert.equal(data.parsed, void 0);
        data.parsed = true;
        return data;
      }
    });
    collection.set({}, {parse: true});
  });

  test('`set` matches input order in the absence of a comparator', () => {
    var one = new Schmackbone.Model({id: 1});
    var two = new Schmackbone.Model({id: 2});
    var three = new Schmackbone.Model({id: 3});
    var collection = new Schmackbone.Collection([one, two, three]);
    collection.set([{id: 3}, {id: 2}, {id: 1}]);
    assert.deepEqual(collection.models, [three, two, one]);
    collection.set([{id: 1}, {id: 2}]);
    assert.deepEqual(collection.models, [one, two]);
    collection.set([two, three, one]);
    assert.deepEqual(collection.models, [two, three, one]);
    collection.set([{id: 1}, {id: 2}], {remove: false});
    assert.deepEqual(collection.models, [two, three, one]);
    collection.set([{id: 1}, {id: 2}, {id: 3}], {merge: false});
    assert.deepEqual(collection.models, [one, two, three]);
    collection.set([three, two, one, {id: 4}], {add: false});
    assert.deepEqual(collection.models, [one, two, three]);
  });

  test('#1894 - Push should not trigger a sort', () => {
    assert.expect(0);
    var Collection = Schmackbone.Collection.extend({
      comparator: 'id',
      sort: function() { assert.ok(false); }
    });
    new Collection().push({id: 1});
  });

  test('#2428 - push duplicate models, return the correct one', () => {
    assert.expect(1);
    var collection = new Schmackbone.Collection;
    var model1 = collection.push({id: 101});
    var model2 = collection.push({id: 101});
    assert.ok(model2.cid === model1.cid);
  });

  test('`set` with non-normal id', () => {
    var Collection = Schmackbone.Collection.extend({
      model: Schmackbone.Model.extend({idAttribute: '_id'})
    });
    var collection = new Collection({_id: 1});
    collection.set([{_id: 1, a: 1}], {add: false});
    assert.equal(collection.first().get('a'), 1);
  });

  test('#1894 - `sort` can optionally be turned off', () => {
    assert.expect(0);
    var Collection = Schmackbone.Collection.extend({
      comparator: 'id',
      sort: function() { assert.ok(false); }
    });
    new Collection().add({id: 1}, {sort: false});
  });

  test('#1915 - `parse` data in the right order in `set`', () => {
    var collection = new (Schmackbone.Collection.extend({
      parse: function(data) {
        assert.strictEqual(data.status, 'ok');
        return data.data;
      }
    }));
    var res = {status: 'ok', data: [{id: 1}]};
    collection.set(res, {parse: true});
  });

  test('#1939 - `parse` is passed `options`', () => {
    var done = assert.async();
    assert.expect(1);
    var collection = new (Schmackbone.Collection.extend({
      url: '/',
      parse: function(data, options) {
        assert.strictEqual(options.xhr.someHeader, 'headerValue');
        return data;
      }
    }));
    var ajax = Schmackbone.ajax;
    Schmackbone.ajax = function(params) {
      _.defer(params.success, []);
      return {someHeader: 'headerValue'};
    };
    collection.fetch({
      success: function() { done(); }
    });
    Schmackbone.ajax = ajax;
  });

  test('fetch will pass extra options to success callback', () => {
    assert.expect(1);
    var SpecialSyncCollection = Schmackbone.Collection.extend({
      url: '/test',
      sync: function(method, collection, options) {
        _.extend(options, {specialSync: true});
        return Schmackbone.Collection.prototype.sync.call(this, method, collection, options);
      }
    });

    var collection = new SpecialSyncCollection();

    var onSuccess = function(coll, resp, options) {
      assert.ok(options.specialSync, 'Options were passed correctly to callback');
    };

    collection.fetch({success: onSuccess});
    this.ajaxSettings.success();
  });

  test('`add` only `sort`s when necessary', () => {
    assert.expect(2);
    var collection = new (Schmackbone.Collection.extend({
      comparator: 'a'
    }))([{id: 1}, {id: 2}, {id: 3}]);
    collection.on('sort', function() { assert.ok(true); });
    collection.add({id: 4}); // do sort, new model
    collection.add({id: 1, a: 1}, {merge: true}); // do sort, comparator change
    collection.add({id: 1, b: 1}, {merge: true}); // don't sort, no comparator change
    collection.add({id: 1, a: 1}, {merge: true}); // don't sort, no comparator change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, {merge: true}); // don't sort
  });

  test('`add` only `sort`s when necessary with comparator function', () => {
    assert.expect(3);
    var collection = new (Schmackbone.Collection.extend({
      comparator: function(m1, m2) {
        return m1.get('a') > m2.get('a') ? 1 : m1.get('a') < m2.get('a') ? -1 : 0;
      }
    }))([{id: 1}, {id: 2}, {id: 3}]);
    collection.on('sort', function() { assert.ok(true); });
    collection.add({id: 4}); // do sort, new model
    collection.add({id: 1, a: 1}, {merge: true}); // do sort, model change
    collection.add({id: 1, b: 1}, {merge: true}); // do sort, model change
    collection.add({id: 1, a: 1}, {merge: true}); // don't sort, no model change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, {merge: true}); // don't sort
  });

  test('Attach options to collection.', () => {
    assert.expect(2);
    var Model = Schmackbone.Model;
    var comparator = function(){};

    var collection = new Schmackbone.Collection([], {
      model: Model,
      comparator: comparator
    });

    assert.ok(collection.model === Model);
    assert.ok(collection.comparator === comparator);
  });

  test('Pass falsey for `models` for empty Col with `options`', () => {
    assert.expect(9);
    var opts = {a: 1, b: 2};
    _.forEach([undefined, null, false], function(falsey) {
      var Collection = Schmackbone.Collection.extend({
        initialize: function(models, options) {
          assert.strictEqual(models, falsey);
          assert.strictEqual(options, opts);
        }
      });

      var collection = new Collection(falsey, opts);
      assert.strictEqual(collection.length, 0);
    });
  });
  */

  test('`add` overrides `set` flags', () => {
    var collection = new Collection();

    collection.once('add', (model, coll, options) => coll.add({id: 2}, options));

    collection.set({id: 1});
    expect(collection.length).toEqual(2);
  });

  test('#2606 - Collection#create, success arguments', async() => {
    var collection = new Collection;

    collection.url = 'test';
    await collection.create({}, {success: (model, resp, options) => expect(resp).toEqual({})});
    await collection.create({}).then(([model, resp, options]) => expect(resp).toEqual({}));
  });

  test('#2612 - nested `parse` works with `Collection#set`', () => {
    var data = {
      name: 'JobName',
      id: 1,
      items: [{
        id: 1,
        name: 'Sub1',
        subItems: [{id: 1, subName: 'One'}, {id: 2, subName: 'Two'}]
      }, {
        id: 2,
        name: 'Sub2',
        subItems: [{id: 3, subName: 'Three'}, {id: 4, subName: 'Four'}]
      }]
    };

    var newData = {
      name: 'NewJobName',
      id: 1,
      items: [{
        id: 1,
        name: 'NewSub1',
        subItems: [{id: 1, subName: 'NewOne'}, {id: 2, subName: 'NewTwo'}]
      }, {
        id: 2,
        name: 'NewSub2',
        subItems: [{id: 3, subName: 'NewThree'}, {id: 4, subName: 'NewFour'}]
      }]
    };

    var job;

    class Item extends Model {
      constructor(attrs, options) {
        super(attrs, options);

        this.subItems = new Collection(attrs.subItems);
      }

      parse(attrs) {
        if (this.subItems) {
          this.subItems.set(attrs.subItems, {parse: true});
        }

        return omit(attrs, 'subItems');
      }
    }

    class Items extends Collection {
      static model = Item
    }

    class Job extends Model {
      constructor(attrs, options) {
        super(attrs, options);

        this.items = new Items(attrs.items);
      }

      parse(attrs) {
        if (this.items) {
          this.items.set(attrs.items, {parse: true});
        }

        return omit(attrs, 'items');
      }
    }

    job = new Job(data, {parse: true});
    expect(job.get('name')).toEqual('JobName');
    expect(job.items.at(0).get('name')).toEqual('Sub1');
    expect(job.items.length).toEqual(2);
    expect(job.items.get(1).subItems.get(1).get('subName')).toEqual('One');
    expect(job.items.get(2).subItems.get(3).get('subName')).toEqual('Three');
    job.set(job.parse(newData, {parse: true}));
    expect(job.get('name')).toEqual('NewJobName');
    expect(job.items.at(0).get('name')).toEqual('NewSub1');
    expect(job.items.length).toEqual(2);
    expect(job.items.get(1).subItems.get(1).get('subName')).toEqual('NewOne');
    expect(job.items.get(2).subItems.get(3).get('subName')).toEqual('NewThree');
  });

  test('_addReference binds all collection events & adds to the lookup hashes', () => {
    var addSpy = jest.fn(),
        removeSpy = jest.fn(),
        collection,
        m;

    class _Collection extends Collection {
      _addReference(model) {
        Collection.prototype._addReference.apply(this, arguments);
        addSpy();
        expect(model).toEqual(this._byId[model.id]);
        expect(model).toEqual(this._byId[model.cid]);
        expect(model._events.all.length).toEqual(1);
      }

      _removeReference(model) {
        Collection.prototype._removeReference.apply(this, arguments);
        removeSpy();
        expect(this._byId[model.id]).not.toBeDefined();
        expect(this._byId[model.cid]).not.toBeDefined();
        expect(model.collection).not.toBeDefined();
      }
    }

    collection = new _Collection();
    m = collection.add({id: 1});
    collection.remove(m);

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  test('Do not allow duplicate models to be `add`ed or `set`', () => {
    var collection = new Collection();

    collection.add([{id: 1}, {id: 1}]);
    expect(collection.length).toEqual(1);
    expect(collection.models.length).toEqual(1);

    collection.set([{id: 1}, {id: 1}]);
    expect(collection.length).toEqual(1);
    expect(collection.models.length).toEqual(1);
  });

  test('#3020: #set with {add: false} should not throw.', () => {
    var collection = new Collection;

    collection.set([{id: 1}], {add: false});
    expect(collection.length).toEqual(0);
    expect(collection.models.length).toEqual(0);
  });

  test('create with wait, model instance, #3028', () => {
    var collection = new Collection(),
        model = new Model({id: 1});

    model.sync = function() {
      expect(this.collection).toEqual(collection);
    };

    collection.create(model, {wait: true});
  });

  test('modelId', () => {
    var collection;

    class Stooge extends Model {}
    class StoogeCollection extends Collection {
      static model = Stooge
    }

    collection = new StoogeCollection;

    // Default to using `Collection::model::idAttribute`.
    expect(collection.modelId({id: 1})).toEqual(1);
    Stooge.idAttribute = '_id';
    expect(collection.modelId({_id: 1})).toEqual(1);
  });

  test('Polymorphic models work with "simple" constructors', () => {
    var collection;

    class A extends Model {}
    class B extends Model {}
    class C extends Collection {
      static model = function(attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }
    }

    collection = new C([{id: 1, type: 'a'}, {id: 2, type: 'b'}]);
    expect(collection.length).toEqual(2);
    expect(collection.at(0)).toBeInstanceOf(A);
    expect(collection.at(0).id).toEqual(1);
    expect(collection.at(1)).toBeInstanceOf(B);
    expect(collection.at(1).id).toEqual(2);
  });

  test('Polymorphic models work with "advanced" constructors', () => {
    var collection;

    class A extends Model {
      static idAttribute = '_id'
    }

    class B extends Model {
      static idAttribute = '_id'
    }

    class D extends Model {
      constructor(attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }

      static idAttribute = '_id'
    }

    class C extends Collection {
      static model = D
    }

    collection = new C([{_id: 1, type: 'a'}, {_id: 2, type: 'b'}]);
    expect(collection.length).toEqual(2);
    expect(collection.at(0)).toBeInstanceOf(A);
    expect(collection.at(0)).toEqual(collection.get(1));
    expect(collection.at(1)).toBeInstanceOf(B);
    expect(collection.at(1)).toEqual(collection.get(2));

    class E extends Collection {
      static model = function(attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }

      modelId(attrs) {
        return attrs.type + '-' + attrs.id;
      }
    }

    collection = new E([{id: 1, type: 'a'}, {id: 1, type: 'b'}]);
    expect(collection.length).toEqual(2);
    expect(collection.at(0)).toBeInstanceOf(A);
    expect(collection.at(0)).toEqual(collection.get('a-1'));
    expect(collection.at(1)).toBeInstanceOf(B);
    expect(collection.at(1)).toEqual(collection.get('b-1'));
  });

  test('Collection with polymorphic models receives default id from modelId', () => {
    var c1,
        c2,
        m;

    // When the polymorphic models use 'id' for the idAttribute, all is fine.
    class C1 extends Collection {
      static model = function(attrs) {
        return new Model(attrs);
      }
    }

    c1 = new C1({id: 1});
    expect(c1.get(1).id).toEqual(1);
    expect(c1.modelId({id: 1})).toEqual(1);

    // If the polymorphic models define their own idAttribute,
    // the modelId method should be overridden, for the reason below.
    class M extends Model {
      static idAttribute = '_id'
    }
    class C2 extends Collection {
      static model = function(attrs) {
        return new M(attrs);
      }
    }

    c2 = new C2({_id: 1});
    expect(c2.get(1)).not.toBeDefined();
    expect(c2.modelId(c2.at(0).attributes)).not.toBeDefined();

    m = new M({_id: 2});
    c2.add(m);
    expect(c2.get(2)).not.toBeDefined();
    expect(c2.modelId(m.attributes)).not.toBeDefined();
  });

  test('Collection implements Iterable, values is default iterator function', () => {
    var $$iterator = typeof Symbol === 'function' && Symbol.iterator,
        collection = new Collection([]),
        iterator = collection[$$iterator]();

    expect(collection[$$iterator]).toEqual(collection.values);
    expect(iterator.next()).toEqual({value: undefined, done: true});
  });

  test('Collection.values iterates models in sorted order', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        iterator = collection.values();

    expect(iterator.next().value).toEqual(one);
    expect(iterator.next().value).toEqual(two);
    expect(iterator.next().value).toEqual(three);
    expect(iterator.next().value).not.toBeDefined();
  });

  test('Collection.keys iterates ids in sorted order', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        iterator = collection.keys();

    expect(iterator.next().value).toEqual(1);
    expect(iterator.next().value).toEqual(2);
    expect(iterator.next().value).toEqual(3);
    expect(iterator.next().value).not.toBeDefined();
  });

  test('Collection.entries iterates ids and models in sorted order', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        iterator = collection.entries();

    expect(iterator.next().value).toEqual([1, one]);
    expect(iterator.next().value).toEqual([2, two]);
    expect(iterator.next().value).toEqual([3, three]);
    expect(iterator.next().value).not.toBeDefined();
  });

  test('#3039 #3951: adding at index fires with correct at', () => {
    var collection = new Collection([{val: 0}, {val: 4}]);

    collection.on('add', (model, coll, options) => {
      expect(model.get('val')).toEqual(options.index);
    });
    collection.add([{val: 1}, {val: 2}, {val: 3}], {at: 1});
    collection.add({val: 5}, {at: 10});
  });

  test('#3039: index is not sent when at is not specified', () => {
    var collection = new Collection([{at: 0}]);

    collection.on('add', (model, coll, options) => {
      expect(options.index).not.toBeDefined();
    });
    collection.add([{at: 1}, {at: 2}]);
  });

  test('#3199 - Order changing should trigger a sort', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        sortSpy = jest.fn();

    collection.on('sort', sortSpy);
    collection.set([{id: 3}, {id: 2}, {id: 1}]);
    expect(sortSpy).toHaveBeenCalled();
  });

  test('#3199 - Adding a model should trigger a sort', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        sortSpy = jest.fn();

    collection.on('sort', sortSpy);
    collection.set([{id: 1}, {id: 2}, {id: 3}, {id: 0}]);
    expect(sortSpy).toHaveBeenCalled();
  });

  test('#3199 - Order not changing should not trigger a sort', () => {
    var one = new Model({id: 1}),
        two = new Model({id: 2}),
        three = new Model({id: 3}),
        collection = new Collection([one, two, three]),
        sortSpy = jest.fn();

    collection.on('sort', sortSpy);
    collection.set([{id: 1}, {id: 2}, {id: 3}]);
    expect(sortSpy).not.toHaveBeenCalled();
  });

  test('add supports negative indexes', () => {
    var collection = new Collection([{id: 1}]);

    collection.add([{id: 2}, {id: 3}], {at: -1});
    collection.add([{id: 2.5}], {at: -2});
    collection.add([{id: 0.5}], {at: -6});
    expect(collection.pluck('id').join(',')).toEqual('1,2,2.5,0.5,3');
  });

  test('#set accepts options.at as a string', () => {
    var collection = new Collection([{id: 1}, {id: 2}]);

    collection.add([{id: 3}], {at: '1'});
    expect(collection.pluck('id')).toEqual([1, 3, 2]);
  });

  test('adding multiple models triggers `update` event once', () => {
    var collection = new Collection,
        updateSpy = jest.fn();

    collection.on('update', updateSpy);
    collection.add([{id: 1}, {id: 2}, {id: 3}]);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('removing models triggers `update` event once', () => {
    var collection = new Collection([{id: 1}, {id: 2}, {id: 3}]),
        updateSpy = jest.fn();

    collection.on('update', updateSpy);
    collection.remove([{id: 1}, {id: 2}]);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('remove does not trigger `update` when nothing removed', () => {
    var collection = new Collection([{id: 1}, {id: 2}]),
        updateSpy = jest.fn();

    collection.on('update', updateSpy);
    collection.remove([{id: 3}]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('set triggers `set` event once', () => {
    var collection = new Collection([{id: 1}, {id: 2}]),
        updateSpy = jest.fn();

    collection.on('update', updateSpy);
    collection.set([{id: 1}, {id: 3}]);
    expect(updateSpy).toHaveBeenCalled();
  });

  test('set does not trigger `update` event when nothing added nor removed', () => {
    var collection = new Collection([{id: 1}, {id: 2}]);

    collection.on('update', (coll, options) => {
      expect(options.changes.added.length).toEqual(0);
      expect(options.changes.removed.length).toEqual(0);
      expect(options.changes.merged.length).toEqual(2);
    });
    collection.set([{id: 1}, {id: 2}]);
  });

  test('#3662 - triggering change without model will not error', () => {
    var collection = new Collection([{id: 1}]),
        model = collection.at(0);

    collection.on('change', (m) => expect(m).not.toBeDefined());
    model.trigger('change');
  });

  test('#3871 - falsy parse result creates empty collection', () => {
    var collection = new Collection;

    collection.parse = function() {};

    collection.set('', {parse: true});
    expect(collection.length).toEqual(0);
  });

  test('#3711 - remove\'s `update` event returns one removed model', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        collection = new Collection([model]);

    collection.on('update', (context, options) => {
      var changed = options.changes;

      expect(changed.added).toEqual([]);
      expect(changed.merged).toEqual([]);
      expect(changed.removed[0]).toEqual(model);
    });
    collection.remove(model);
  });

  test('#3711 - remove\'s `update` event returns multiple removed models', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        collection = new Collection([model, model2]);

    collection.on('update', (context, options) => {
      var changed = options.changes;

      expect(changed.added).toEqual([]);
      expect(changed.merged).toEqual([]);
      expect(changed.removed.length).toEqual(2);
      expect(changed.removed.indexOf(model) > -1 &&
        changed.removed.indexOf(model2) > -1).toBe(true);
    });
    collection.remove([model, model2]);
  });

  test('#3711 - set\'s `update` event returns one added model', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        collection = new Collection();

    collection.on('update', (context, options) => {
      var addedModels = options.changes.added;

      expect(addedModels.length).toEqual(1);
      expect(addedModels[0]).toEqual(model);
    });
    collection.set(model);
  });

  test('#3711 - set\'s `update` event returns multiple added models', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        collection = new Collection();

    collection.on('update', (context, options) => {
      var addedModels = options.changes.added;

      expect(addedModels.length).toEqual(2);
      expect(addedModels[0]).toEqual(model);
      expect(addedModels[1]).toEqual(model2);
    });
    collection.set([model, model2]);
  });

  test('#3711 - set\'s `update` event returns one removed model', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        model3 = new Model({id: 3, title: 'My Last Post'}),
        collection = new Collection([model]);

    collection.on('update', (context, options) => {
      var changed = options.changes;

      expect(changed.added.length).toEqual(2);
      expect(changed.merged.length).toEqual(0);
      expect(changed.removed.length).toEqual(1);
      expect(changed.removed[0]).toEqual(model);
    });
    collection.set([model2, model3]);
  });

  test('#3711 - set\'s `update` event returns multiple removed models', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        model3 = new Model({id: 3, title: 'My Last Post'}),
        collection = new Collection([model, model2]);

    collection.on('update', (context, options) => {
      var removedModels = options.changes.removed;

      expect(removedModels.length).toEqual(2);
      expect(removedModels[0]).toEqual(model);
      expect(removedModels[1]).toEqual(model2);
    });
    collection.set([model3]);
  });

  test('#3711 - set\'s `update` event returns one merged model', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        model2Update = new Model({id: 2, title: 'Second Post V2'}),
        collection = new Collection([model, model2]);

    collection.on('update', (context, options) => {
      var mergedModels = options.changes.merged;

      expect(mergedModels.length).toEqual(1);
      expect(mergedModels[0].get('title')).toEqual(model2Update.get('title'));
    });
    collection.set([model2Update]);
  });

  test('#3711 - set\'s `update` event returns multiple merged models', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        modelUpdate = new Model({id: 1, title: 'First Post V2'}),
        model2 = new Model({id: 2, title: 'Second Post'}),
        model2Update = new Model({id: 2, title: 'Second Post V2'}),
        collection = new Collection([model, model2]);

    collection.on('update', (context, options) => {
      var mergedModels = options.changes.merged;

      expect(mergedModels).toHaveLength(2);
      expect(mergedModels[0].get('title')).toEqual(model2Update.get('title'));
      expect(mergedModels[1].get('title')).toEqual(modelUpdate.get('title'));
    });

    collection.set([model2Update, modelUpdate]);
  });

  test('#3711 - set\'s `update` event should not be triggered adding a model which already ' +
      'exists exactly alike', () => {
    var model = new Model({id: 1, title: 'First Post'}),
        collection = new Collection([model]),
        updateSpy = jest.fn();

    collection.on('update', updateSpy);
    collection.set([model]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('get models with `attributes` key', () => {
    var model = {id: 1, attributes: {}},
        collection = new Collection([model]);

    expect(!!collection.get(model)).toBe(true);
  });
});
