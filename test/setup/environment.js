import * as Sync from '../../lib/sync.js';

var history = window.history;
var pushState = history.pushState;
var replaceState = history.replaceState;

var env = {};

beforeAll(function() {
  // We never want to actually call these during tests.
  history.pushState = history.replaceState = function() {};

  // Capture ajax settings for comparison.
  jasmine.spyOn(Sync, 'ajax').and.callFake((settings) => {
    env.ajaxSettings = settings;
  });

  // Capture the arguments to Schmackbone.sync for comparison.
  jasmine.spyOn(Sync, 'default').and.callFake((method, model, options) => {
    env.syncArgs = {method, model, options};
    Sync.default(this, arguments);
  });
});

afterAll(() => {
  history.pushState = pushState;
  history.replaceState = replaceState;
});
