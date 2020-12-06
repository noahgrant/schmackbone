import _mixin from '../lib/_mixin';
import Collection from '../lib/collection';
import {isEqual} from 'underscore';
import Model from '../lib/model';

/* eslint-disable id-length */
describe('mixin', () => {
  test('works with a collection', () => {
    var coll;

    class _Collection extends Collection {}

    _mixin(_Collection, {sum: (models, iteratee) => models.reduce((s, m) => s + iteratee(m), 0)});

    coll = new _Collection([
      {a: 1},
      {a: 1, b: 2},
      {a: 2, b: 2},
      {a: 3}
    ]);

    expect(coll.sum((m) => m.get('a'))).toEqual(7);
  });

  test('works with a model', () => {
    var model1,
        model2,
        model3;

    class _Model extends Model {}

    _mixin(_Model, {isEqual: (m1, m2) => isEqual(m1, m2.attributes)});

    model1 = new _Model({a: {b: 2}, c: 3});
    model2 = new _Model({a: {b: 2}, c: 3});
    model3 = new _Model({a: {b: 4}, c: 3});

    expect(model1.isEqual(model2)).toBe(true);
    expect(model1.isEqual(model3)).toBe(false);
  });
});

describe('Underscore methods', () => {
  var a,
      b,
      c,
      d,
      col;

  beforeEach(() => {
    require('../lib/add_underscore_methods');

    a = new Model({id: 3, label: 'a'});
    b = new Model({id: 2, label: 'b'});
    c = new Model({id: 1, label: 'c'});
    d = new Model({id: 0, label: 'd'});
    col = new Collection([a, b, c, d]);
  });

  afterEach(() => {
    delete require.cache[require.resolve('../lib/add_underscore_methods')];
  });

  test('get added to Model and Collection constructor when the script is loaded', () => {
    var wrapped,
        first;

    expect(Collection.prototype.all).toBeDefined();
    expect(Collection.prototype.first).toBeDefined();
    expect(Collection.prototype.last).toBeDefined();
    expect(Collection.prototype.sortBy).toBeDefined();
    expect(Collection.prototype.without).toBeDefined();
    expect(Model.prototype.keys).toBeDefined();
    expect(Model.prototype.values).toBeDefined();
    expect(Model.prototype.pick).toBeDefined();
    expect(Model.prototype.omit).toBeDefined();

    expect(col.map((model) => model.get('label')).join(' ')).toEqual('a b c d');
    expect(col.some((model) => model.id === 100)).toEqual(false);
    expect(col.some((model) => model.id === 0)).toEqual(true);
    expect(col.reduce((m1, m2) => m1.id > m2.id ? m1 : m2).id).toEqual(3);
    expect(col.reduceRight((m1, m2) => m1.id > m2.id ? m1 : m2).id).toEqual(3);
    expect(col.indexOf(b)).toEqual(1);
    expect(col.size()).toEqual(4);
    expect(col.rest().length).toEqual(3);
    expect(col.rest().includes(a)).toBe(false);
    expect(col.rest().includes(d)).toBe(true);
    expect(col.isEmpty()).toBe(false);
    expect(col.without(d).includes(d)).toBe(false);

    wrapped = col.chain();
    expect(wrapped.map('id').max().value()).toEqual(3);
    expect(wrapped.map('id').min().value()).toEqual(0);
    expect(wrapped.filter((o) => o.id % 2 === 0)
        .map((o) => o.id * 2)
        .value()).toEqual([4, 0]);
    expect(col.difference([c, d])).toEqual([a, b]);
    expect(col.includes(col.sample())).toBe(true);

    first = col.first();
    expect(col.groupBy((model) => model.id)[first.id]).toEqual([first]);
    expect(col.countBy((model) => model.id)).toEqual({0: 1, 1: 1, 2: 1, 3: 1});
    expect(col.sortBy((model) => model.id)[0]).toEqual(col.at(3));
    expect(col.indexBy('id')[first.id]).toEqual(first);
  });

  test('Underscore methods with object-style and property-style iteratee', () => {
    var model = new Model({a: 4, b: 1, e: 3});
    var coll = new Collection([
      {a: 1, b: 1},
      {a: 2, b: 1, c: 1},
      {a: 3, b: 1},
      model
    ]);

    expect(coll.find({a: 0})).not.toBeDefined();
    expect(coll.find({a: 4})).toEqual(model);
    expect(coll.find('d')).not.toBeDefined();
    expect(coll.find('e')).toEqual(model);
    expect(coll.filter({a: 0})).toEqual([]);
    expect(coll.filter({a: 4})).toEqual([model]);
    expect(coll.some({a: 0})).toBe(false);
    expect(coll.some({a: 1})).toBe(true);
    expect(coll.reject({a: 0}).length).toEqual(4);
    expect(coll.reject({a: 4})).toEqual(coll.models.filter((m) => m !== model));
    expect(coll.every({a: 0})).toBe(false);
    expect(coll.every({b: 1})).toBe(true);
    expect(coll.partition({a: 0})[0]).toEqual([]);
    expect(coll.partition({a: 0})[1]).toEqual(coll.models);
    expect(coll.partition({a: 4})[0]).toEqual([model]);
    expect(coll.partition({a: 4})[1]).toEqual(coll.models.filter((m) => m !== model));
    expect(coll.map({a: 2})).toEqual([false, true, false, false]);
    expect(coll.map('a')).toEqual([1, 2, 3, 4]);
    expect(coll.sortBy('a')[3]).toEqual(model);
    expect(coll.sortBy('e')[0]).toEqual(model);
    expect(coll.countBy({a: 4})).toEqual({false: 3, true: 1});
    expect(coll.countBy('d')).toEqual({undefined: 4});
    expect(coll.findIndex({b: 1})).toEqual(0);
    expect(coll.findIndex({b: 9})).toEqual(-1);
    expect(coll.findLastIndex({b: 1})).toEqual(3);
    expect(coll.findLastIndex({b: 9})).toEqual(-1);
  });

  test('model methods', () => {
    var model = new Model({foo: 'a', bar: 'b', baz: 'c'});

    expect(model.keys()).toEqual(['foo', 'bar', 'baz']);
    expect(model.values()).toEqual(['a', 'b', 'c']);
    expect(model.invert()).toEqual({a: 'foo', b: 'bar', c: 'baz'});
    expect(model.pick('foo', 'baz')).toEqual({foo: 'a', baz: 'c'});
    expect(model.omit('foo', 'bar')).toEqual({baz: 'c'});
  });

  test('chain', () => {
    var model = new Model({a: 0, b: 1, c: 2});

    expect(model.chain().pick('a', 'b', 'c').values().compact().value()).toEqual([1, 2]);
  });
});
