import {escape, isEmpty, isEqual, iteratee, result, uniqueId} from 'underscore';
import {urlError, wrapError} from './utils.js';

import Events from './events.js';
import sync from './sync.js';

// Schmackbone.Model
// --------------

// Schmackbone **Models** are the basic data object in the framework --
// frequently representing a row in a table in a database on your server.
// A discrete chunk of data and a bunch of useful, related methods for
// performing computations and transformations on that data.

// Create a new model with the specified attributes. A client id (`cid`)
// is automatically generated and assigned for you.
export default class Model {
  constructor(attributes={}, options={}) {
    this.preinitialize(...arguments);
    this.cid = uniqueId(this.constructor.cidPrefix);
    this.attributes = {};

    if (options.collection) {
      this.collection = options.collection;
    }

    if (options.parse) {
      attributes = this.parse(attributes, options) || {};
    }

    this.set({...result(this.constructor, 'defaults'), ...attributes}, options);
    this.changed = {};
    this.initialize(...arguments);
  }

  // A hash of attributes whose current and previous value differ.
  changed = null

  // The value returned during the last failed validation.
  validationError = null

  // The default name for the JSON `id` attribute is `"id"`. MongoDB and
  // CouchDB users may want to set this to `"_id"`.
  static idAttribute = 'id'

  // The prefix is used to create the client id which is used to identify models locally.
  // You may want to override this if you're experiencing name clashes with model ids.
  static cidPrefix = 'c'

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Model.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // Return a copy of the model's `attributes` object.
  toJSON(options) {
    return {...this.attributes};
  }

  // Proxy `Schmackbone.sync` by default -- but override this if you need
  // custom syncing semantics for *this* particular model.
  sync() {
    return sync.apply(this, arguments);
  }

  // Get the value of an attribute.
  get(attr) {
    return this.attributes[attr];
  }

  // get the values of multiple attributes
  pick(...attrs) {
    return attrs.reduce((memo, attr) => Object.assign(
      memo,
      this.has(attr) ? {[attr]: this.get(attr)} : {}
    ), {});
  }

  // Get the HTML-escaped value of an attribute.
  escape(attr) {
    return escape(this.get(attr));
  }

  // Returns `true` if the attribute contains a value that is not null
  // or undefined.
  has(attr) {
    /* eslint-disable eqeqeq */
    return this.get(attr) != null;
    /* eslint-enable eqeqeq */
  }

  // Special-cased proxy to underscore's `_.matches` method.
  matches(attrs) {
    return !!iteratee(attrs, this)(this.attributes);
  }

  // Set a hash of model attributes on the object, firing `"change"`. This is
  // the core primitive operation of a model, updating the data and notifying
  // anyone who needs to know about the change in state. The heart of the beast.
  set(key, val, options) {
    var attrs;

    /* eslint-disable eqeqeq */
    if (key == null) {
      return this;
    }
    /* eslint-enable eqeqeq */

    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options || (options = {});

    // Run validation.
    if (!this._validate(attrs, options)) {
      return false;
    }

    let changes = [];
    let changing = this._changing;

    this._changing = true;

    if (!changing) {
      this._previousAttributes = {...this.attributes};
      this.changed = {};
    }

    let current = this.attributes;

    // For each `set` attribute, update or delete the current value.
    for (let attr of Object.keys(attrs)) {
      val = attrs[attr];

      if (!isEqual(current[attr], val)) {
        changes.push(attr);
      }

      if (!isEqual(this._previousAttributes[attr], val)) {
        this.changed[attr] = val;
      } else {
        delete this.changed[attr];
      }

      options.unset ? delete current[attr] : current[attr] = val;
    }

    // Update the `id`.
    if (this.constructor.idAttribute in attrs) {
      this.id = this.get(this.constructor.idAttribute);
    }

    // Trigger all relevant attribute changes.
    if (!options.silent) {
      if (changes.length) {
        this._pending = options;
      }

      for (let i = 0; i < changes.length; i++) {
        this.trigger('change:' + changes[i], this, current[changes[i]], options);
      }
    }

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"change"` events.
    if (changing) {
      return this;
    }

    if (!options.silent) {
      while (this._pending) {
        options = this._pending;
        this._pending = false;
        this.trigger('change', this, options);
      }
    }

    this._pending = false;
    this._changing = false;

    return this;
  }

  // Remove an attribute from the model, firing `"change"`. `unset` is a noop
  // if the attribute doesn't exist.
  unset(attr, options) {
    return this.set(attr, undefined, {unset: true, ...options});
  }

  // Clear all attributes on the model, firing `"change"`.
  clear(options) {
    var attrs = {};

    for (let key of Object.keys(this.attributes)) {
      attrs[key] = undefined;
    }

    return this.set(attrs, {unset: true, ...options});
  }

  // Determine if the model has changed since the last `"change"` event.
  // If you specify an attribute name, determine if that attribute has changed.
  hasChanged(attr) {
    /* eslint-disable eqeqeq */
    if (attr == null) {
      return !isEmpty(this.changed);
    }
    /* eslint-enable eqeqeq */

    return this.changed.hasOwnProperty(attr);
  }

  // Return an object containing all the attributes that have changed, or
  // false if there are no changed attributes. Useful for determining what
  // parts of a view need to be updated and/or what attributes need to be
  // persisted to the server. Unset attributes will be set to undefined.
  // You can also pass an attributes object to diff against the model,
  // determining if there *would be* a change.
  changedAttributes(diff) {
    if (!diff) {
      return this.hasChanged() ? {...this.changed} : false;
    }

    let old = this._changing ? this._previousAttributes : this.attributes;
    let changed = {};
    let hasChanged;

    for (let [attr, val] of Object.entries(diff)) {
      if (isEqual(old[attr], val)) {
        continue;
      }

      changed[attr] = val;
      hasChanged = true;
    }

    return hasChanged ? changed : false;
  }

  // Get the previous value of an attribute, recorded at the time the last
  // `"change"` event was fired.
  previous(attr) {
    /* eslint-disable eqeqeq */
    if (attr == null || !this._previousAttributes) {
      return null;
    }
    /* eslint-enable eqeqeq */

    return this._previousAttributes[attr];
  }

  // Get all of the attributes of the model at the time of the previous
  // `"change"` event.
  previousAttributes() {
    return {...this._previousAttributes};
  }

  // Fetch the model from the server, merging the response with the model's
  // local attributes. Any changed attributes will trigger a "change" event.
  fetch(options={}) {
    var model = this;
    var success = options.success;

    options = {parse: true, ...options};

    options.success = function(resp) {
      var serverAttrs = options.parse ? model.parse(resp, options) : resp;

      if (!model.set(serverAttrs, options)) {
        return false;
      }

      model.trigger('sync', model, resp, options);

      if (success || options.complete) {
        if (success) {
          success.call(options.context, model, resp, options);
        }

        if (options.complete) {
          options.complete();
        }
      }

      return [model, resp, options];
    };

    wrapError(this, options);

    return this.sync('read', this, options);
  }

  // Set a hash of model attributes, and sync the model to the server.
  // If the server returns an attributes hash that differs, the model's
  // state will be `set` again.
  save(key, val, options) {
    // Handle both `"key", value` and `{key: value}` -style arguments.
    var attrs;

    /* eslint-disable eqeqeq */
    if (key == null || typeof key === 'object') {
    /* eslint-enable eqeqeq */
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options = {validate: true, parse: true, ...options};

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !options.wait) {
      if (!this.set(attrs, options)) {
        return false;
      }
    } else if (!this._validate(attrs, options)) {
      return false;
    }

    // After a successful server-side save, the client is (optionally)
    // updated with the server-side state.
    let model = this;
    let success = options.success;
    let attributes = this.attributes;

    options.success = function(resp) {
      var serverAttrs = options.parse ? model.parse(resp, options) : resp;

      // Ensure attributes are restored during synchronous saves.
      model.attributes = attributes;

      if (options.wait) {
        serverAttrs = {...attrs, ...serverAttrs};
      }

      if (serverAttrs && !model.set(serverAttrs, options)) {
        return false;
      }

      model.trigger('sync', model, resp, options);

      if (success || options.complete) {
        if (success) {
          success.call(options.context, model, resp, options);
        }

        if (options.complete) {
          options.complete();
        }
      }

      return [model, resp, options];
    };

    wrapError(this, options);

    // Set temporary attributes if `{wait: true}` to properly find new ids.
    if (attrs && options.wait) {
      this.attributes = {...attributes, ...attrs};
    }

    let method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';

    if (method === 'patch' && !options.attrs) {
      options.attrs = attrs;
    }

    let xhr = this.sync(method, this, options);

    // Restore attributes.
    this.attributes = attributes;

    return xhr;
  }

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy(options={}) {
    var model = this,
        {success} = options,
        destroy = function() {
          model.stopListening();
          model.trigger('destroy', model, model.collection, options);
        };

    options.success = function(resp) {
      if (options.wait) {
        destroy();
      }

      if (!model.isNew()) {
        model.trigger('sync', model, resp, options);
      }

      if (success || options.complete) {
        if (success) {
          success.call(options.context, model, resp, options);
        }

        if (options.complete) {
          options.complete();
        }
      }

      return [model, resp, options];
    };

    let xhr;

    if (this.isNew()) {
      xhr = Promise.resolve().then(options.success);
    } else {
      wrapError(this, options);
      xhr = this.sync('delete', this, options);
    }

    if (!options.wait) {
      destroy();
    }

    return xhr;
  }

  // Default URL for the model's representation on the server -- if you're
  // using Schmackbone's restful methods, override this to change the endpoint
  // that will be called.
  url() {
    var base = result(this, 'urlRoot') || result(this.collection, 'url') || urlError();

    if (this.isNew()) {
      return base;
    }

    return base.replace(/[^/]$/, '$&/') +
      encodeURIComponent(this.get(this.constructor.idAttribute));
  }

  // **parse** converts a response into the hash of attributes to be `set` on
  // the model. The default implementation is just to pass the response along.
  parse(resp, options) {
    return resp;
  }

  // Create a new model with identical attributes to this one.
  clone() {
    return new this.constructor(this.attributes);
  }

  // A model is new if it has never been saved to the server, and lacks an id.
  isNew() {
    return !this.has(this.constructor.idAttribute);
  }

  // Check if the model is currently in a valid state.
  isValid(options) {
    return this._validate({}, {...options, validate: true});
  }

  // Run validation against the next complete set of model attributes,
  // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
  _validate(attrs={}, options) {
    if (!options.validate || !this.validate) {
      return true;
    }

    attrs = {...this.attributes, ...attrs};
    let error = this.validationError = this.validate(attrs, options) || null;

    if (!error) {
      return true;
    }

    this.trigger('invalid', this, error, {...options, validationError: error});

    return false;
  }
}

Object.assign(Model.prototype, Events);
