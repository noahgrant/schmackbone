import * as Sync from '../../lib/sync.js';

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
  sinon.stub(Sync, 'ajax').callsFake((settings) => {
    env.ajaxSettings = settings;
  });

  // Capture the arguments to Schmackbone.sync for comparison.
  sinon.stub(Sync, 'default').callsFake((method, model, options) => {
    env.syncArgs = {method, model, options};
    Sync.default(this, arguments);
  });

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

QUnit.testDone(() => {
  history.pushState = pushState;
  history.replaceState = replaceState;
});
