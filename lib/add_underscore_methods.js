import _ from 'underscore';
import {addMethods} from './_mixin.js';
import Collection from './collection.js';
import Model from './model.js';

/**
 * This file is used to add underscore methods to a constructor and is totally opt-in.
 * By default this is not included in the Schmackbone package.
 */

// Underscore methods that we want to implement on the Collection.
const collectionMethods = [
  'all',
  'any',
  'chain',
  'collect',
  'contains',
  'countBy',
  'detect',
  'difference',
  'drop',
  'each',
  'every',
  'filter',
  'find',
  'findIndex',
  'findLastIndex',
  'first',
  'foldl',
  'foldr',
  'forEach',
  'groupBy',
  'head',
  'include',
  'includes',
  'indexBy',
  'indexOf',
  'initial',
  'inject',
  'invoke',
  'isEmpty',
  'last',
  'lastIndexOf',
  'map',
  'max',
  'min',
  'partition',
  'reduce',
  'reduceRight',
  'reject',
  'rest',
  'sample',
  'select',
  'shuffle',
  'size',
  'some',
  'sortBy',
  'tail',
  'take',
  'toArray',
  'without'
];

// Underscore methods that we want to implement on the Model
const modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'chain', 'isEmpty'];

// Mix in each Underscore method as a proxy to `Collection#models`.
[
  [Collection, collectionMethods],
  [Model, modelMethods]
].forEach((config) => mixinUnderscoreMethods(...config));

function mixinUnderscoreMethods(Base, methods=[]) {
  var attribute = (new Base()) instanceof Collection ? 'models' : 'attributes';

  addMethods(Base, _, methods, attribute);
}
