import Events from '../lib/events';
import {size} from 'underscore';

/* eslint-disable id-length */
describe('Schmackbone.Events', () => {
  test('on and trigger', () => {
    var obj = {counter: 0, ...Events};

    obj.on('event', () => obj.counter += 1);
    obj.trigger('event');
    expect(obj.counter).toEqual(1);
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counter).toEqual(5);
  });

  test('binding and triggering multiple events', () => {
    var obj = {counter: 0, ...Events};

    obj.on('a b c', () => obj.counter += 1);

    obj.trigger('a');
    expect(obj.counter).toEqual(1);

    obj.trigger('a b');
    expect(obj.counter).toEqual(3);

    obj.trigger('c');
    expect(obj.counter).toEqual(4);

    obj.off('a c');
    obj.trigger('a b c');
    expect(obj.counter).toEqual(5);
  });

  test('binding and triggering with event maps', () => {
    var obj = {counter: 0, ...Events},
        increment = function() {
          this.counter += 1;
        };

    obj.on({
      a: increment,
      b: increment,
      c: increment
    }, obj);

    obj.trigger('a');
    expect(obj.counter).toEqual(1);

    obj.trigger('a b');
    expect(obj.counter).toEqual(3);

    obj.trigger('c');
    expect(obj.counter).toEqual(4);

    obj.off({
      a: increment,
      c: increment
    }, obj);
    obj.trigger('a b c');
    expect(obj.counter).toEqual(5);
  });

  test('binding and triggering multiple event names with event maps', () => {
    var obj = {counter: 0, ...Events},
        increment = function() {
          this.counter += 1;
        };

    obj.on({'a b c': increment});

    obj.trigger('a');
    expect(obj.counter).toEqual(1);

    obj.trigger('a b');
    expect(obj.counter).toEqual(3);

    obj.trigger('c');
    expect(obj.counter).toEqual(4);

    obj.off({'a c': increment});
    obj.trigger('a b c');
    expect(obj.counter).toEqual(5);
  });

  test('binding and trigger with event maps context', () => {
    var obj = {counter: 0, ...Events},
        context = {};

    obj.on({
      a: function() {
        expect(this).toEqual(context);
      }
    }, context).trigger('a');

    obj.off().on({
      a: function() {
        expect(this).toEqual(context);
      }
    }, this, context).trigger('a');
  });

  test('listenTo and stopListening', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenTo(b, 'all', callback);
    b.trigger('anything');
    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();

    expect(callback).not.toHaveBeenCalled();
    a.listenTo(b, 'all', callback);
    a.stopListening();
    b.trigger('anything');
    expect(callback).not.toHaveBeenCalled();
  });

  test('listenTo and stopListening with event maps', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenTo(b, {event: callback});
    b.trigger('event');
    expect(callback).toHaveBeenCalledTimes(1);

    a.listenTo(b, {event2: callback});
    b.on('event2', callback);
    expect(callback).toHaveBeenCalledTimes(1);

    a.stopListening(b, {event2: callback});
    b.trigger('event event2');
    expect(callback).toHaveBeenCalledTimes(3);
    a.stopListening();
    b.trigger('event event2');
    expect(callback).toHaveBeenCalledTimes(4);
  });

  test('stopListening with omitted args', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenTo(b, 'event', callback);
    b.on('event', callback);
    a.listenTo(b, 'event2', callback);
    a.stopListening(null, {event: callback});

    b.trigger('event event2');
    expect(callback).toHaveBeenCalledTimes(2);
    b.off();

    a.listenTo(b, 'event event2', callback);
    a.stopListening(null, 'event');
    a.stopListening();
    b.trigger('event2');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test('listenToOnce', () => {
    // Same as the previous test, but we use once rather than having to explicitly unbind
    var obj = {counterA: 0, counterB: 0, ...Events},
        incrA = function() {
          obj.counterA += 1;
          obj.trigger('event');
        },
        incrB = () => obj.counterB += 1;

    obj.listenToOnce(obj, 'event', incrA);
    obj.listenToOnce(obj, 'event', incrB);
    obj.trigger('event');

    expect(obj.counterA).toEqual(1);
    expect(obj.counterB).toEqual(1);
  });

  test('listenToOnce and stopListening', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenToOnce(b, 'all', callback);
    b.trigger('anything');
    b.trigger('anything');
    expect(callback).toHaveBeenCalledTimes(1);
    a.listenToOnce(b, 'all', callback);
    a.stopListening();
    b.trigger('anything');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('listenTo, listenToOnce and stopListening', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenToOnce(b, 'all', callback);
    b.trigger('anything');
    b.trigger('anything');
    expect(callback).toHaveBeenCalledTimes(1);
    a.listenTo(b, 'all', callback);
    a.stopListening();
    b.trigger('anything');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('listenTo and stopListening with event maps', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenTo(b, {change: callback});
    b.trigger('change');
    expect(callback).toHaveBeenCalledTimes(1);

    a.listenTo(b, {change: callback});
    a.stopListening();
    b.trigger('change');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('listenTo yourself', () => {
    var e = {...Events},
        callback = jest.fn();

    e.listenTo(e, 'foo', callback);
    e.trigger('foo');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('listenTo yourself cleans yourself up with stopListening', () => {
    var e = {...Events},
        callback = jest.fn();

    e.listenTo(e, 'foo', callback);
    e.trigger('foo');
    expect(callback).toHaveBeenCalledTimes(1);
    e.stopListening();
    e.trigger('foo');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('stopListening cleans up references', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    b.on('event', callback);
    a.listenTo(b, 'event', callback).stopListening();

    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', callback).stopListening(b);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', callback).stopListening(b, 'event');
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', callback).stopListening(b, 'event', callback);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
  });

  test('stopListening cleans up references from listenToOnce', () => {
    var a = {...Events},
        b = {...Events},
        fn = jest.fn();

    b.on('event', fn);
    a.listenToOnce(b, 'event', fn).stopListening();
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenToOnce(b, 'event', fn).stopListening(b);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenToOnce(b, 'event', fn).stopListening(b, 'event');
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
    a.listenToOnce(b, 'event', fn).stopListening(b, 'event', fn);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._events.event)).toEqual(1);
    expect(size(b._listeners)).toEqual(0);
  });

  test('listenTo and off cleaning up references', () => {
    var a = {...Events},
        b = {...Events},
        fn = jest.fn();

    a.listenTo(b, 'event', fn);
    b.off();
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', fn);
    b.off('event');
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', fn);
    b.off(null, fn);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._listeners)).toEqual(0);
    a.listenTo(b, 'event', fn);
    b.off(null, null, a);
    expect(size(a._listeningTo)).toEqual(0);
    expect(size(b._listeners)).toEqual(0);
  });

  test('listenTo and stopListening cleaning up references', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenTo(b, 'all', callback);
    b.trigger('anything');
    a.listenTo(b, 'other', callback);
    a.stopListening(b, 'other');
    a.stopListening(b, 'all');
    expect(size(a._listeningTo)).toEqual(0);
  });

  test('listenToOnce without context cleans up references after the event has fired', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn();

    a.listenToOnce(b, 'all', callback);
    b.trigger('anything');
    expect(size(a._listeningTo)).toEqual(0);
  });

  test('listenToOnce with event maps cleans up references', () => {
    var a = {...Events},
        b = {...Events},
        callback = jest.fn(),
        callback2 = jest.fn();

    a.listenToOnce(b, {one: callback, two: callback2});
    b.trigger('one');
    expect(size(a._listeningTo)).toEqual(1);
  });

  test('listenToOnce with event maps binds the correct `this`', () => {
    var a = {...Events},
        b = {...Events};

    a.listenToOnce(b, {
      one: function() {
        expect(this).toEqual(a);
      },
      two: function() {}
    });
    b.trigger('one');
  });

  test('listenTo with empty callback doesn\'t throw an error', () => {
    var a = {...Events};

    a.listenTo(a, 'foo', null);
    a.trigger('foo');
  });

  test('trigger all for each event', () => {
    var a,
        b,
        obj = {counter: 0, ...Events};

    obj.on('all', (event) => {
      obj.counter++;

      if (event === 'a') {
        a = true;
      }

      if (event === 'b') {
        b = true;
      }
    }).trigger('a b');

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(obj.counter).toEqual(2);
  });

  test('on, then unbind all functions', () => {
    var obj = {counter: 0, ...Events};
    var callback = () => obj.counter += 1;

    obj.on('event', callback);
    obj.trigger('event');
    obj.off('event');
    obj.trigger('event');
    expect(obj.counter).toEqual(1);
  });

  test('bind two callbacks, unbind only one', () => {
    var obj = {counterA: 0, counterB: 0, ...Events};
    var callback = () => obj.counterA += 1;

    obj.on('event', callback);
    obj.on('event', () => obj.counterB += 1);
    obj.trigger('event');
    obj.off('event', callback);
    obj.trigger('event');
    expect(obj.counterA).toEqual(1);
    expect(obj.counterB).toEqual(2);
  });

  test('unbind a callback in the midst of it firing', () => {
    var obj = {counter: 0, ...Events},
        callback = () => {
          obj.counter += 1;
          obj.off('event', callback);
        };

    obj.on('event', callback);
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counter).toEqual(1);
  });

  test('two binds that unbind themeselves', () => {
    var obj = {counterA: 0, counterB: 0, ...Events},
        incrA = () => {
          obj.counterA += 1;
          obj.off('event', incrA);
        },
        incrB = () => {
          obj.counterB += 1;
          obj.off('event', incrB);
        };

    obj.on('event', incrA);
    obj.on('event', incrB);
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counterA).toEqual(1);
    expect(obj.counterB).toEqual(1);
  });

  test('bind a callback with a default context when none supplied', () => {
    var obj = {
      assertTrue: function() {
        expect(this).toEqual(obj);
      },
      ...Events
    };

    obj.once('event', obj.assertTrue);
    obj.trigger('event');
  });

  test('bind a callback with a supplied context', () => {
    var obj = {...Events},
        TestClass = function() {
          return this;
        };

    TestClass.prototype.assertTrue = jest.fn();

    obj.on('event', function() {
      this.assertTrue();
    }, new TestClass);
    obj.trigger('event');
    expect(TestClass.prototype.assertTrue).toHaveBeenCalled();
  });

  test('nested trigger with unbind', () => {
    var obj = {counter: 0, ...Events},
        incr1 = function() {
          obj.counter += 1;
          obj.off('event', incr1);
          obj.trigger('event');
        },
        incr2 = () => obj.counter += 1;

    obj.on('event', incr1);
    obj.on('event', incr2);
    obj.trigger('event');
    expect(obj.counter).toEqual(3);
  });

  test('callback list is not altered during trigger', () => {
    var counter = 0,
        obj = {...Events},
        incr = () => counter++,
        incrOn = () => obj.on('event all', incr),
        incrOff = () => obj.off('event all', incr);

    obj.on('event all', incrOn).trigger('event');
    expect(counter).toEqual(0);

    obj.off().on('event', incrOff).on('event all', incr).trigger('event');
    expect(counter).toEqual(2);
  });

  test('#1282 - \'all\' callback list is retrieved after each event.', () => {
    var counter = 0,
        obj = {...Events},
        incr = () => counter++;

    obj.on('x', () => obj.on('y', incr).on('all', incr))
        .trigger('x y');
    expect(counter).toEqual(2);
  });

  test('if no callback is provided, `on` is a noop', () => {
    var obj = {...Events};

    obj.on('test').trigger('test');
  });

  test('if callback is truthy but not a function, `on` should throw an error just like jQuery',
    () => {
      var view = {...Events};

      view.on('test', 'noop');

      expect(() => view.trigger('test')).toThrow();
    });

  test('remove all events for a specific context', () => {
    var obj = {...Events},
        success = jest.fn(),
        fail = jest.fn();

    obj.on('x y all', success);
    obj.on('x y all', fail, obj);
    obj.off(null, null, obj);
    obj.trigger('x y');

    expect(success).toHaveBeenCalledTimes(4);
    expect(fail).not.toHaveBeenCalled();
  });

  test('remove all events for a specific callback', () => {
    var obj = {...Events},
        success = jest.fn(),
        fail = jest.fn();

    obj.on('x y all', success);
    obj.on('x y all', fail);
    obj.off(null, fail);
    obj.trigger('x y');
    expect(success).toHaveBeenCalledTimes(4);
    expect(fail).not.toHaveBeenCalled();
  });

  test('#1310 - off does not skip consecutive events', () => {
    var obj = {...Events},
        callback = jest.fn();

    obj.on('event', callback, obj);
    obj.on('event', callback, obj);
    obj.off(null, null, obj);
    obj.trigger('event');
    expect(callback).not.toHaveBeenCalled();
  });

  test('once', () => {
    // Same as the previous test, but we use once rather than having to explicitly unbind
    var obj = {counterA: 0, counterB: 0, ...Events},
        incrA = () => {
          obj.counterA += 1;
          obj.trigger('event');
        },
        incrB = () => obj.counterB += 1;

    obj.once('event', incrA);
    obj.once('event', incrB);
    obj.trigger('event');
    expect(obj.counterA).toEqual(1);
    expect(obj.counterB).toEqual(1);
  });

  test('once variant one', () => {
    var a = {...Events},
        b = {...Events},
        fn = jest.fn();

    a.once('event', fn);
    b.on('event', fn);

    a.trigger('event');
    expect(fn).toHaveBeenCalledTimes(1);
    b.trigger('event');
    expect(fn).toHaveBeenCalledTimes(2);
    b.trigger('event');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('once variant two', () => {
    var obj = {...Events},
        fn = jest.fn();

    obj.once('event', fn)
        .on('event', fn)
        .trigger('event')
        .trigger('event');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('once with off', () => {
    var obj = {...Events},
        fn = jest.fn();

    obj.once('event', fn);
    obj.off('event', fn);
    obj.trigger('event');

    expect(fn).not.toHaveBeenCalled();
  });

  test('once with event maps', () => {
    var obj = {counter: 0, ...Events},
        increment = function() {
          this.counter += 1;
        };

    obj.once({
      a: increment,
      b: increment,
      c: increment
    }, obj);

    obj.trigger('a');
    expect(obj.counter).toEqual(1);

    obj.trigger('a b');
    expect(obj.counter).toEqual(2);

    obj.trigger('c');
    expect(obj.counter).toEqual(3);

    obj.trigger('a b c');
    expect(obj.counter).toEqual(3);
  });

  test('bind a callback with a supplied context using once with object notation', () => {
    var obj = {counter: 0, ...Events},
        context = {};

    obj.once({
      a: function() {
        expect(this).toEqual(context);
      }
    }, context).trigger('a');
  });

  test('once with off only by context', () => {
    var context = {},
        obj = {...Events},
        fn = jest.fn();

    obj.once('event', fn, context);
    obj.off(null, null, context);
    obj.trigger('event');
    expect(fn).not.toHaveBeenCalled();
  });

  test('once with multiple events.', () => {
    var obj = {...Events},
        fn = jest.fn();

    obj.once('x y', fn);
    obj.trigger('x y');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('Off during iteration with once.', () => {
    var obj = {...Events},
        fn = function() {
          this.off('event', fn);
        },
        callback = jest.fn();

    obj.on('event', fn);
    obj.once('event', () => {});
    obj.on('event', callback);

    obj.trigger('event');
    obj.trigger('event');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test('once without a callback is a noop', () => {
    var obj = {...Events};

    obj.once('event').trigger('event');
  });

  test('listenToOnce without a callback is a noop', () => {
    var obj = {...Events};

    obj.listenToOnce(obj, 'event').trigger('event');
  });

  test('event functions are chainable', () => {
    var obj = {...Events},
        obj2 = {...Events},
        fn = function() {};

    expect(obj).toEqual(obj.trigger('noeventssetyet'));
    expect(obj).toEqual(obj.off('noeventssetyet'));
    expect(obj).toEqual(obj.stopListening('noeventssetyet'));
    expect(obj).toEqual(obj.on('a', fn));
    expect(obj).toEqual(obj.once('c', fn));
    expect(obj).toEqual(obj.trigger('a'));
    expect(obj).toEqual(obj.listenTo(obj2, 'a', fn));
    expect(obj).toEqual(obj.listenToOnce(obj2, 'b', fn));
    expect(obj).toEqual(obj.off('a c'));
    expect(obj).toEqual(obj.stopListening(obj2, 'a'));
    expect(obj).toEqual(obj.stopListening());
  });

  test('#3448 - listenToOnce with space-separated events', () => {
    var one = {...Events},
        two = {...Events},
        count = 1;

    one.listenToOnce(two, 'x y', (n) => expect(n).toEqual(count++));
    two.trigger('x', 1);
    two.trigger('x', 1);
    two.trigger('y', 2);
    two.trigger('y', 2);
  });

  test('#3611 - listenTo is compatible with non-Schmackbone event libraries', () => {
    var obj = {...Events},
        cb = jest.fn(),
        other = {
          events: {},
          on: function(name, callback) {
            this.events[name] = callback;
          },
          trigger: function(name) {
            this.events[name]();
          }
        };

    obj.listenTo(other, 'test', cb);
    other.trigger('test');
    expect(cb).toHaveBeenCalled();
  });

  test('#3611 - stopListening is compatible with non-Schmackbone event libraries', () => {
    var obj = {...Events},
        cb = jest.fn(),
        other = {
          events: {},
          on: function(name, callback) {
            this.events[name] = callback;
          },
          off: function() {
            this.events = {};
          },
          trigger: function(name) {
            var fn = this.events[name];

            if (fn) {
              fn();
            }
          }
        };

    obj.listenTo(other, 'test', cb);
    obj.stopListening(other);
    other.trigger('test');
    expect(size(obj._listeningTo)).toEqual(0);
  });
});
