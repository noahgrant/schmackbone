import _, {functions, isFunction, isObject, isString, matches} from 'underscore';

import Collection from './collection.js';
import Model from './model.js';

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

function addUnderscoreMethods(Class, base, methods, attribute) {
  Object.keys(methods).forEach((method) => {
    if (base[method]) {
      Class.prototype[method] = addMethod(base, methods[method], method, attribute);
    }
  });
}

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
  var matcher = matches(attrs);

  return (model) => matcher(model.attributes);
}
