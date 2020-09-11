const origSetTimeout = window.setTimeout;
const origClearTimeout = window.clearTimeout;
const origSetInterval = window.setInterval;
const origClearInterval = window.clearInterval;

// helper method for asynchronous tests
export const waitsFor = (condition, time = 3000, name = 'something to happen') => {
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
