import _, {functions, isFunction, isObject, isString, matches} from 'underscore';
import Collection from './collection.js';

/**
 * This file is used to add underscore methods to a constructor and is totally opt-in.
 * By default this is not included in the Schmackbone package.
 */
export default function(Base, methods={}) {
  var attribute = Base instanceof Collection ? 'models' : 'attributes';

  Base.mixin = function(obj) {
    var mappings = functions(obj).reduce((memo, name) => Object.assign({...memo, [name]: 0}), {});

    addUnderscoreMethods(Base, obj, mappings, attribute);
  };

  addUnderscoreMethods(Base, _, methods, attribute);
}

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

      return base[method].call(base, ...args);
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
