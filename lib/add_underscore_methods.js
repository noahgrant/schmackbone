import _mixin from '_mixin.js';
import Collection from './collection.js';
import Model from './model.js';

// Underscore methods that we want to implement on the Collection.
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
[[Collection, collectionMethods], [Model, modelMethods]].forEach((config) => _mixin(...config));
