import {isFunction, isObject, isString, matches} from 'underscore';
import Collection from './collection.js';

/**
 * This file is by default not used in the Schmackbone package, but can be imported in use the mixin
 * method, ie:
 *   mixin(Colletion, {sum: (models, iteratee) => models.reduce((s, m) => s + iteratee(m), 0)})
 *
 * Its main purpose is to add underscore methods via the add_underscore_methods script, which is why
 * its filename is prefixed with an underscore.
 */

export default function(Base, obj) {
  addMethods(Base, obj, undefined, (new Base()) instanceof Collection ? 'models' : 'attributes');
}

export function addMethods(Class, base, methods=Object.keys(base), attribute) {
  methods.forEach((method) => {
    if (base[method]) {
      Class.prototype[method] = addMethod(base, method, attribute);
    }
  });
}

// Proxy Schmackbone class methods to Underscore functions, wrapping the model's
// `attributes` object or collection's `models` array behind the scenes.
//
// collection.filter(function(model) { return model.get('age') > 10 });
// collection.each(this.addView);
function addMethod(base, method, attribute) {
  return function(iteratee, ...args) {
    return base[method](this[attribute], cb(iteratee, this), ...args);
  };
}

// Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
function cb(iteratee, instance) {
  if (!(instance instanceof Collection)) {
    return iteratee;
  }

  if (isFunction(iteratee)) {
    return iteratee;
  }

  if (isObject(iteratee) && !Array.isArray(iteratee) && !instance._isModel(iteratee)) {
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
