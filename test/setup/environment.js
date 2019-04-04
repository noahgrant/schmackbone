(function(QUnit) {

  var sync = Backbone.sync;
  var ajax = Backbone.ajax;
  var emulateHTTP = Backbone.emulateHTTP;
  var emulateJSON = Backbone.emulateJSON;
  var history = window.history;
  var pushState = history.pushState;
  var replaceState = history.replaceState;
  const origSetTimeout = window.setTimeout;
  const origClearTimeout = window.clearTimeout;
  const origSetInterval = window.setInterval;
  const origClearInterval = window.clearInterval;

  QUnit.config.noglobals = true;

  QUnit.testStart(function() {
    var env = QUnit.config.current.testEnvironment;

    // We never want to actually call these during tests.
    history.pushState = history.replaceState = function() {};

    // Capture ajax settings for comparison.
    Backbone.ajax = function(settings) {
      env.ajaxSettings = settings;
    };

    // Capture the arguments to Backbone.sync for comparison.
    Backbone.sync = function(method, model, options) {
      env.syncArgs = {
        method: method,
        model: model,
        options: options
      };
      sync.apply(this, arguments);
    };

    // helper method for asynchronous tests
    env.waitsFor = (condition, time = 3000, name = 'something to happen') => {
      var interval,
          timeout = origSetTimeout(() => {
            origClearInterval(interval);
            throw new Error(`Timed out after ${time}ms waiting for ${name}`);
          }, time);

      return new Promise((res) => {
        interval = origSetInterval(() => {
          if (condition()) {
            origClearInterval(interval);
            origClearTimeout(timeout);
            res();
          }
        }, 0);
      });
    };

  });

  QUnit.testDone(function() {
    Backbone.sync = sync;
    Backbone.ajax = ajax;
    Backbone.emulateHTTP = emulateHTTP;
    Backbone.emulateJSON = emulateJSON;
    history.pushState = pushState;
    history.replaceState = replaceState;
  });

})(QUnit);
