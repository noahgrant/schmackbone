import {once, uniqueId} from 'underscore';

// Schmackbone.Events
// ---------------

// A module that can be mixed in to *any object* in order to provide it with
// a custom event channel. You may bind a callback to an event with `on` or
// remove with `off`; `trigger`-ing an event fires all callbacks in
// succession.
//
//     var object = {};
//     _.extend(object, Schmackbone.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// A private global variable to share between listeners and listenees.
var _listening;

// Iterates over the standard `event, callback` (as well as the fancy multiple
// space-separated events `"change blur", callback` and jQuery-style event
// maps `{event: callback}`).
var eventsApi = function(iteratee, events, name, callback, opts) {
  var i = 0,
      names;

  if (name && typeof name === 'object') {
    // Handle event maps.
    if (callback !== undefined && 'context' in opts && opts.context === undefined) {
      opts.context = callback;
    }

    for (names = Object.keys(name); i < names.length; i++) {
      events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
    }
  } else if (name && eventSplitter.test(name)) {
    // Handle space-separated event names by delegating them individually.
    for (names = name.split(eventSplitter); i < names.length; i++) {
      events = iteratee(events, names[i], callback, opts);
    }
  } else {
    // Finally, standard events.
    events = iteratee(events, name, callback, opts);
  }

  return events;
};

// The reducing API that adds a callback to the `events` object.
var onApi = function(events, name, callback, options) {
  if (callback) {
    let handlers = events[name] || (events[name] = []);
    let context = options.context,
        ctx = options.ctx,
        listening = options.listening;

    if (listening) {
      listening.count++;
    }

    handlers.push({callback, context, ctx: context || ctx, listening});
  }

  return events;
};

// An try-catch guarded #on function, to prevent poisoning the global
// `_listening` variable.
var tryCatchOn = function(obj, name, callback, context) {
  try {
    obj.on(name, callback, context);
  } catch (err) {
    return err;
  }
};

// The reducing API that removes a callback from the `events` object.
var offApi = function(events, name, callback, options) {
  var {context, listeners} = options,
      i = 0,
      names;

  if (!events) {
    return;
  }

  // Delete all event listeners and "drop" events.
  if (!name && !context && !callback) {
    for (names = Object.keys(listeners || {}); i < names.length; i++) {
      listeners[names[i]].cleanup();
    }

    return;
  }

  names = name ? [name] : Object.keys(events);

  for (; i < names.length; i++) {
    let handlers;

    name = names[i];
    handlers = events[name];

    // Bail out if there are no events stored.
    if (!handlers) {
      break;
    }

    // Find any remaining events.
    let remaining = [];

    for (let j = 0; j < handlers.length; j++) {
      let handler = handlers[j];

      if (
        callback && callback !== handler.callback &&
          callback !== handler.callback._callback ||
            context && context !== handler.context
      ) {
        remaining.push(handler);
      } else if (handler.listening) {
        handler.listening.off(name, callback);
      }
    }

    // Replace events if there are any remaining.  Otherwise, clean up.
    if (remaining.length) {
      events[name] = remaining;
    } else {
      delete events[name];
    }
  }

  return events;
};

// Reduces the event callbacks into a map of `{event: onceWrapper}`.
// `offer` unbinds the `onceWrapper` after it has been called.
var onceMap = function(map, name, callback, offer) {
  if (callback) {
    let _once = map[name] = once(function() {
      offer(name, _once);
      callback.apply(this, arguments);
    });

    _once._callback = callback;
  }

  return map;
};

// Trigger one or many events, firing all bound callbacks. Callbacks are
// passed the same arguments as `trigger` is, apart from the event name
// (unless you're listening on `"all"`, which will cause your callback to
// receive the true name of the event as the first argument).

// Handles triggering the appropriate event callbacks.
function triggerApi(objEvents, name, callback, args) {
  if (objEvents) {
    let events = objEvents[name];
    let allEvents = objEvents.all;

    if (events && allEvents) {
      allEvents = allEvents.slice();
    }

    if (events) {
      triggerEvents(events, args);
    }

    if (allEvents) {
      triggerEvents(allEvents, [name].concat(args));
    }
  }

  return objEvents;
}

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Schmackbone events have 3 arguments).
function triggerEvents(events, args) {
  var ev,
      i = -1,
      len = events.length,
      [a1, a2, a3] = args;

  /* eslint-disable */
  switch (args.length) {
    case 0: while (++i < len) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < len) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < len) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < len) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    default: while (++i < len) (ev = events[i]).callback.apply(ev.ctx, args); return;
  }
  /* eslint-enable */
}

// A listening class that tracks and cleans up memory bindings
// when all callbacks have been offed.
class Listening {
  constructor(listener, obj) {
    this.id = listener._listenId;
    this.listener = listener;
    this.obj = obj;
    this.interop = true;
    this.count = 0;
    this._events = undefined;
  }

  // Offs a callback (or several).
  // Uses an optimized counter if the listenee uses Schmackbone.Events.
  // Otherwise, falls back to manual tracking to support events
  // library interop.
  off(name, callback) {
    var cleanup;

    if (this.interop) {
      this._events = eventsApi(offApi, this._events, name, callback, {
        context: undefined,
        listeners: undefined
      });
      cleanup = !this._events;
    } else {
      this.count--;
      cleanup = this.count === 0;
    }

    if (cleanup) {
      this.cleanup();
    }
  }

  // Cleans up memory bindings between the listener and the listenee.
  cleanup() {
    delete this.listener._listeningTo[this.obj._listenId];

    if (!this.interop) {
      delete this.obj._listeners[this.id];
    }
  }
}

const Events = {
  trigger(name, ...args) {
    if (!this._events) {
      return this;
    }

    eventsApi(triggerApi, this._events, name, undefined, args);

    return this;
  },

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on(name, callback, context) {
    this._events = eventsApi(onApi, this._events || {}, name, callback, {
      context,
      ctx: this,
      listening: _listening
    });

    if (_listening) {
      let listeners = this._listeners || (this._listeners = {});

      listeners[_listening.id] = _listening;
      // Allow the listening to use a counter, instead of tracking
      // callbacks for library interop
      _listening.interop = false;
    }

    return this;
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off(name, callback, context) {
    if (!this._events) {
      return this;
    }

    this._events = eventsApi(offApi, this._events, name, callback, {
      context,
      listeners: this._listeners
    });

    return this;
  },

  // Inversion-of-control versions of `once`.
  listenToOnce(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.stopListening.bind(this, obj));

    return this.listenTo(obj, events);
  },

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  listenTo(obj, name, callback) {
    if (!obj) {
      return this;
    }

    let id = obj._listenId || (obj._listenId = uniqueId('l'));
    let listeningTo = this._listeningTo || (this._listeningTo = {});
    let listening = _listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      this._listenId || (this._listenId = uniqueId('l'));
      listening = _listening = listeningTo[id] = new Listening(this, obj);
    }

    // Bind callbacks on obj.
    let error = tryCatchOn(obj, name, callback, this);

    _listening = undefined;

    if (error) {
      throw error;
    }

    // If the target obj is not Schmackbone.Events, track events manually.
    if (listening.interop) {
      listening.on(name, callback);
    }

    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  once(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.off.bind(this));

    if (typeof name === 'string' && !context) {
      callback = undefined;
    }

    return this.on(events, callback, context);
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening(obj, name, callback) {
    var listeningTo = this._listeningTo;

    if (!listeningTo) {
      return this;
    }

    let ids = obj ? [obj._listenId] : Object.keys(listeningTo);

    for (let i = 0; i < ids.length; i++) {
      let listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) {
        break;
      }

      listening.obj.off(name, callback, this);

      if (listening.interop) {
        listening.off(name, callback);
      }
    }

    if (!Object.keys(listeningTo).length) {
      this._listeningTo = undefined;
    }

    return this;
  }
};

export default Events;

Listening.prototype.on = Events.on;
