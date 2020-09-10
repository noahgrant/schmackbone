import _, {functions, isFunction, isObject, isString} from 'underscore';

import Events from './events.js';
import Model from './model.js';
import sync from './sync.js';
import {wrapError} from './utils.js';

// This "enum" defines the three possible kinds of values which can be emitted
// by a CollectionIterator that correspond to the values(), keys() and entries()
// methods on Collection, respectively.
const ITERATOR_VALUES = 1;
const ITERATOR_KEYS = 2;
const ITERATOR_KEYSVALUES = 3;

// Schmackbone.Collection
// -------------------

// If models tend to represent a single row of data, a Schmackbone Collection is
// more analogous to a table full of data ... or a small slice or page of that
// table, or a collection of rows that belong together for a particular reason
// -- all of the messages in this particular folder, all of the documents
// belonging to this particular author, and so on. Collections maintain
// indexes of their models, both in order, and for lookup by `id`.

// Create a new **Collection**, perhaps to contain a specific type of `model`.
// If a `comparator` is specified, the Collection will maintain
// its models in sort order, as they're added and removed.
/* eslint-disable eqeqeq */
export default class Collection {
  constructor(models, options={}) {
    this.preinitialize(...arguments);

    if (options.model) {
      this.model = options.model;
    }

    if (options.comparator) {
      this.comparator = options.comparator;
    }

    this._reset();
    this.initialize(...arguments);

    if (models) {
      this.reset(models, {...options, silent: true});
    }
  }

  // The default model for a collection is just a **Schmackbone.Model**.
  // This should be overridden in most cases.
  model = Model

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Collection.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // The JSON representation of a Collection is an array of the
  // models' attributes.
  toJSON(options) {
    return this.map((model) => model.toJSON(options));
  }

  // Proxy `Schmackbone.sync` by default.
  sync() {
    return sync.apply(this, arguments);
  }

  // Add a model, or list of models to the set. `models` may be Schmackbone
  // Models or raw JavaScript objects to be converted to Models, or any
  // combination of the two.
  add(models, options) {
    return this.set(models, {add: true, remove: false, ...options, merge: false});
  }

  // Remove a model, or a list of models from the set.
  remove(models, options={}) {
    var singular = !Array.isArray(models),
        removed;

    models = singular ? [models] : models.slice();
    removed = this._removeModels(models, options);

    if (!options.silent && removed.length) {
      options.changes = {added: [], merged: [], removed};
      this.trigger('update', this, options);
    }

    return singular ? removed[0] : removed;
  }

  // Update a collection by `set`-ing a new list of models, adding new ones,
  // removing models that are no longer present, and merging models that
  // already exist in the collection, as necessary. Similar to **Model#set**,
  // the core operation for updating the data contained by the collection.
  set(models, options) {
    if (!models) {
      return;
    }

    options = {add: true, remove: true, merge: true, ...options};

    if (options.parse && !this._isModel(models)) {
      models = this.parse(models, options) || [];
    }

    let singular = !Array.isArray(models);
    let models = singular ? [models] : models.slice();

    let at = options.at;

    if (at != null) {
      at = +at;
    }

    if (at > this.length) {
      at = this.length;
    }

    if (at < 0) {
      at += this.length + 1;
    }

    let set = [];
    let toAdd = [];
    let toMerge = [];
    let toRemove = [];
    let modelMap = {};

    let add = options.add;
    let merge = options.merge;
    let remove = options.remove;

    let sort = false;
    let sortable = this.comparator && at == null && options.sort !== false;
    let sortAttr = isString(this.comparator) ? this.comparator : null;

    // Turn bare objects into model references, and prevent invalid models
    // from being added.
    let model;
    let i;

    for (i = 0; i < models.length; i++) {
      model = models[i];

      // If a duplicate is found, prevent it from being added and
      // optionally merge it into the existing model.
      let existing = this.get(model);

      if (existing) {
        if (merge && model !== existing) {
          let attrs = this._isModel(model) ? model.attributes : model;

          if (options.parse) {
            attrs = existing.parse(attrs, options);
          }

          existing.set(attrs, options);
          toMerge.push(existing);

          if (sortable && !sort) {
            sort = existing.hasChanged(sortAttr);
          }
        }

        if (!modelMap[existing.cid]) {
          modelMap[existing.cid] = true;
          set.push(existing);
        }

        models[i] = existing;

      // If this is a new, valid model, push it to the `toAdd` list.
      } else if (add) {
        model = models[i] = this._prepareModel(model, options);

        if (model) {
          toAdd.push(model);
          this._addReference(model, options);
          modelMap[model.cid] = true;
          set.push(model);
        }
      }
    }

    // Remove stale models.
    if (remove) {
      for (i = 0; i < this.length; i++) {
        model = this.models[i];

        if (!modelMap[model.cid]) {
          toRemove.push(model);
        }
      }

      if (toRemove.length) {
        this._removeModels(toRemove, options);
      }
    }

    // See if sorting is needed, update `length` and splice in new models.
    let orderChanged = false;
    let replace = !sortable && add && remove;

    if (set.length && replace) {
      orderChanged = this.length !== set.length ||
        this.models.some((_model, index) => _model !== set[index]);
      this.models.length = 0;
      this.models.splice(set, 0);
      this.length = this.models.length;
    } else if (toAdd.length) {
      if (sortable) {
        sort = true;
      }

      this.models.splice(toAdd, at == null ? this.length : at);
      this.length = this.models.length;
    }

    // Silently sort the collection if appropriate.
    if (sort) {
      this.sort({silent: true});
    }

    // Unless silenced, it's time to fire all appropriate add/sort/update events.
    if (!options.silent) {
      for (i = 0; i < toAdd.length; i++) {
        if (at != null) {
          options.index = at + i;
        }

        model = toAdd[i];
        model.trigger('add', model, this, options);
      }

      if (sort || orderChanged) {
        this.trigger('sort', this, options);
      }

      if (toAdd.length || toRemove.length || toMerge.length) {
        options.changes = {
          added: toAdd,
          removed: toRemove,
          merged: toMerge
        };
        this.trigger('update', this, options);
      }
    }

    // Return the added (or merged) model (or models).
    return singular ? models[0] : models;
  }

  // When you have more items than you want to add or remove individually,
  // you can reset the entire set with a new list of models, without firing
  // any granular `add` or `remove` events. Fires `reset` when finished.
  // Useful for bulk operations and optimizations.
  reset(models, options={}) {
    options = {...options};

    for (let i = 0; i < this.models.length; i++) {
      this._removeReference(this.models[i], options);
    }

    options.previousModels = this.models;
    this._reset();
    models = this.add(models, {...options, silent: true});

    if (!options.silent) {
      this.trigger('reset', this, options);
    }

    return models;
  }

  // Add a model to the end of the collection.
  push(model, options) {
    return this.add(model, {...options, at: this.length});
  }

  // Remove a model from the end of the collection.
  pop(options) {
    var model = this.at(this.length - 1);

    return this.remove(model, options);
  }

  // Add a model to the beginning of the collection.
  unshift(model, options) {
    return this.add(model, {...options, at: 0});
  }

  // Remove a model from the beginning of the collection.
  shift(options) {
    var model = this.at(0);

    return this.remove(model, options);
  }

  // Slice out a sub-array of models from the collection.
  slice() {
    return [].prototype.slice.apply(this.models, arguments);
  }

  // Get a model from the set by id, cid, model object with id or cid
  // properties, or an attributes object that is transformed through modelId.
  get(obj) {
    if (obj == null) {
      return undefined;
    }

    return this._byId[obj] ||
      this._byId[this.modelId(this._isModel(obj) ? obj.attributes : obj)] ||
      obj.cid && this._byId[obj.cid];
  }

  // Returns `true` if the model is in the collection.
  has(obj) {
    return this.get(obj) != null;
  }

  // Get the model at the given index.
  at(index) {
    if (index < 0) {
      index += this.length;
    }

    return this.models[index];
  }

  // Return models with matching attributes. Useful for simple cases of
  // `filter`.
  where(attrs, first) {
    return this[first ? 'find' : 'filter'](attrs);
  }

  // Return the first model with matching attributes. Useful for simple cases
  // of `find`.
  findWhere(attrs) {
    return this.where(attrs, true);
  }

  // Force the collection to re-sort itself. You don't need to call this under
  // normal circumstances, as the set will maintain sort order as each item
  // is added.
  sort(options={}) {
    var comparator = this.comparator;

    if (!comparator) {
      throw new Error('Cannot sort a set without a comparator');
    }

    if (isFunction(comparator)) {
      comparator = comparator.bind(this);
    }

    // Run sort based on type of `comparator`.
    if (comparator.length === 1 || isString(comparator)) {
      this.models = this.sortBy(comparator);
    } else {
      this.models.sort(comparator);
    }

    if (!options.silent) {
      this.trigger('sort', this, options);
    }

    return this;
  }

  // Pluck an attribute from each model in the collection.
  pluck(attr) {
    return this.map(attr + '');
  }

  // Fetch the default set of models for this collection, resetting the
  // collection when they arrive. If `reset: true` is passed, the response
  // data will be passed through the `reset` method instead of `set`.
  fetch(options={}) {
    var success = options.success;
    var collection = this;

    options = {...options, parse: true};

    options.success = function(resp) {
      var method = options.reset ? 'reset' : 'set';

      collection[method](resp, options);
      collection.trigger('sync', collection, resp, options);

      if (success || options.complete) {
        if (success) {
          success.call(options.context, collection, resp, options);
        }

        if (options.complete) {
          options.complete();
        }
      }

      return [collection, resp, options];
    };

    wrapError(this, options);

    return this.sync('read', this, options);
  }

  // Create a new instance of a model in this collection. Add the model to the
  // collection immediately, unless `wait: true` is passed, in which case we
  // wait for the server to agree.
  create(model, options={}) {
    var collection = this;
    var success = options.success;

    model = this._prepareModel(model, options);

    if (!model) {
      return false;
    }

    if (!options.wait) {
      this.add(model, options);
    }

    options.success = function(_model, resp, callbackOpts) {
      if (options.wait) {
        collection.add(_model, callbackOpts);
      }

      if (success) {
        success.call(callbackOpts.context, _model, resp, callbackOpts);
      }
    };

    return model.save(null, options);
  }

  // **parse** converts a response into a list of models to be added to the
  // collection. The default implementation is just to pass it through.
  parse(resp, options) {
    return resp;
  }

  // Create a new collection with an identical list of models as this one.
  clone() {
    return new this.constructor(this.models, {
      model: this.model,
      comparator: this.comparator
    });
  }

  // Define how to uniquely identify models in the collection.
  modelId(attrs) {
    return attrs[this.model.prototype.idAttribute || 'id'];
  }

  // Get an iterator of all models in this collection.
  values() {
    return new CollectionIterator(this, ITERATOR_VALUES);
  }

  // Get an iterator of all model IDs in this collection.
  keys() {
    return new CollectionIterator(this, ITERATOR_KEYS);
  }

  // Get an iterator of all [ID, model] tuples in this collection.
  entries() {
    return new CollectionIterator(this, ITERATOR_KEYSVALUES);
  }

  // Private method to reset all internal state. Called when the collection
  // is first initialized or reset.
  _reset() {
    this.length = 0;
    this.models = [];
    this._byId = {};
  }

  // Prepare a hash of attributes (or other model) to be added to this
  // collection.
  _prepareModel(attrs, options={}) {
    if (this._isModel(attrs)) {
      if (!attrs.collection) {
        attrs.collection = this;
      }

      return attrs;
    }

    options = {...options};
    options.collection = this;

    /* eslint-disable new-cap */
    let model = new this.model(attrs, options);

    if (!model.validationError) {
      return model;
    }

    this.trigger('invalid', this, model.validationError, options);

    return false;
  }

  // Internal method called by both remove and set.
  _removeModels(models, options) {
    var removed = [];

    for (let i = 0; i < models.length; i++) {
      let model = this.get(models[i]);

      if (!model) {
        continue;
      }

      let index = this.indexOf(model);

      this.models.splice(index, 1);
      this.length--;

      // Remove references before triggering 'remove' event to prevent an
      // infinite loop. #3693
      delete this._byId[model.cid];

      let id = this.modelId(model.attributes);

      if (id != null) {
        delete this._byId[id];
      }

      if (!options.silent) {
        options.index = index;
        model.trigger('remove', model, this, options);
      }

      removed.push(model);
      this._removeReference(model, options);
    }

    return removed;
  }

  // Method for checking whether an object should be considered a model for
  // the purposes of adding to the collection.
  _isModel(model) {
    return model instanceof Model;
  }

  // Internal method to create a model's ties to a collection.
  _addReference(model, options) {
    this._byId[model.cid] = model;

    let id = this.modelId(model.attributes);

    if (id != null) {
      this._byId[id] = model;
    }

    model.on('all', this._onModelEvent, this);
  }

  // Internal method to sever a model's ties to a collection.
  _removeReference(model, options) {
    delete this._byId[model.cid];

    let id = this.modelId(model.attributes);

    if (id != null) {
      delete this._byId[id];
    }

    if (this === model.collection) {
      delete model.collection;
    }

    model.off('all', this._onModelEvent, this);
  }

  // Internal method called every time a model in the set fires an event.
  // Sets need to update their indexes when models change ids. All other
  // events simply proxy through. "add" and "remove" events that originate
  // in other collections are ignored.
  _onModelEvent(event, model, collection, options) {
    if (model) {
      if ((event === 'add' || event === 'remove') && collection !== this) {
        return;
      }

      if (event === 'destroy') {
        this.remove(model, options);
      }

      if (event === 'change') {
        let prevId = this.modelId(model.previousAttributes());
        let id = this.modelId(model.attributes);

        if (prevId !== id) {
          if (prevId != null) {
            delete this._byId[prevId];
          }

          if (id != null) {
            this._byId[id] = model;
          }
        }
      }
    }

    this.trigger(...arguments);
  }
}

// Define the Collection's inheritable methods.
Object.assign(Collection.prototype, Events);

// Defining an @@iterator method implements JavaScript's Iterable protocol.
// In modern ES2015 browsers, this value is found at Symbol.iterator.
let $$iterator = typeof Symbol === 'function' && Symbol.iterator;

if ($$iterator) {
  Collection.prototype[$$iterator] = Collection.prototype.values;
}

// CollectionIterator
// ------------------

// A CollectionIterator implements JavaScript's Iterator protocol, allowing the
// use of `for of` loops in modern browsers and interoperation between
// Schmackbone.Collection and other JavaScript functions and third-party libraries
// which can operate on Iterables.
function CollectionIterator(collection, kind) {
  this._collection = collection;
  this._kind = kind;
  this._index = 0;
}

// All Iterators should themselves be Iterable.
if ($$iterator) {
  CollectionIterator.prototype[$$iterator] = function() {
    return this;
  };
}

CollectionIterator.prototype.next = function() {
  if (this._collection) {
    // Only continue iterating if the iterated collection is long enough.
    if (this._index < this._collection.length) {
      let model = this._collection.at(this._index);

      this._index++;

      // Construct a value depending on what kind of values should be iterated.
      let value;

      if (this._kind === ITERATOR_VALUES) {
        value = model;
      } else {
        let id = this._collection.modelId(model.attributes);

        if (this._kind === ITERATOR_KEYS) {
          value = id;
        // ITERATOR_KEYSVALUES
        } else {
          value = [id, model];
        }
      }

      return {value, done: false};
    }

    // Once exhausted, remove the reference to the collection so future
    // calls to the next method always return done.
    this._collection = undefined;
  }

  return {value: undefined, done: true};
};

// Proxy Schmackbone class methods to Underscore functions, wrapping the model's
// `attributes` object or collection's `models` array behind the scenes.
//
// collection.filter(function(model) { return model.get('age') > 10 });
// collection.each(this.addView);
//
// `Function#apply` can be slow so we use the method's arg count, if we know it.
function addMethod(base, length, method, attribute) {
  switch (length) {
    case 1: return function() {
      return base[method](this[attribute]);
    };
    case 2: return function(value) {
      return base[method](this[attribute], value);
    };
    case 3: return function(iteratee, context) {
      return base[method](this[attribute], cb(iteratee, this), context);
    };
    case 4: return function(iteratee, defaultVal, context) {
      return base[method](this[attribute], cb(iteratee, this), defaultVal, context);
    };
    default: return function(...args) {
      args.unshift(this[attribute]);

      return base[method].apply(base, ...args);
    };
  }
}

function addUnderscoreMethods(Class, base, methods, attribute) {
  Object.keys(methods).forEach((method) => {
    if (base[method]) {
      Class.prototype[method] = addMethod(base, methods[method], method, attribute);
    }
  });
}

// Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
function cb(iteratee, instance) {
  if (isFunction(iteratee)) {
    return iteratee;
  }

  if (isObject(iteratee) && !instance._isModel(iteratee)) {
    return modelMatcher(iteratee);
  }

  if (isString(iteratee)) {
    return (model) => model.get(iteratee);
  }

  return iteratee;
}

function modelMatcher(attrs) {
  var matcher = _.matches(attrs);

  return (model) => matcher(model.attributes);
}

// Underscore methods that we want to implement on the Collection.
// 90% of the core usefulness of Schmackbone Collections is actually implemented
// right here:
const collectionMethods = {
  all: 3,
  any: 3,
  chain: 1,
  collect: 3,
  contains: 3,
  countBy: 3,
  detect: 3,
  difference: 0,
  drop: 3,
  each: 3,
  every: 3,
  filter: 3,
  find: 3,
  findIndex: 3,
  findLastIndex: 3,
  first: 3,
  foldl: 0,
  foldr: 0,
  forEach: 3,
  groupBy: 3,
  head: 3,
  include: 3,
  includes: 3,
  indexBy: 3,
  indexOf: 3,
  initial: 3,
  inject: 0,
  invoke: 0,
  isEmpty: 1,
  last: 3,
  lastIndexOf: 3,
  map: 3,
  max: 3,
  min: 3,
  partition: 3,
  reduce: 0,
  reduceRight: 0,
  reject: 3,
  rest: 3,
  sample: 3,
  select: 3,
  shuffle: 1,
  size: 1,
  some: 3,
  sortBy: 3,
  tail: 3,
  take: 3,
  toArray: 1,
  without: 0
};

// Underscore methods that we want to implement on the Model, mapped to the
// number of arguments they take.
const modelMethods = {
  keys: 1,
  values: 1,
  pairs: 1,
  invert: 1,
  pick: 0,
  omit: 0,
  chain: 1,
  isEmpty: 1
};

// Mix in each Underscore method as a proxy to `Collection#models`.
[
  [Collection, collectionMethods, 'models'],
  [Model, modelMethods, 'attributes']
].forEach((config) => {
  var [Base, methods, attribute] = config;

  Base.mixin = function(obj) {
    var mappings = functions(obj).reduce((memo, name) => Object.assign({...memo, name: 0}), {});

    addUnderscoreMethods(Base, obj, mappings, attribute);
  };

  addUnderscoreMethods(Base, _, methods, attribute);
});
