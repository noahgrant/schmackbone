// Helpers
// -------

export function noOp() {}

export function identity(item) {
  return item;
}

// Throw an error when a URL is needed, and none is supplied.
export function urlError() {
  throw new Error('A "url" property or function must be specified');
}

// Wrap an optional error callback with a fallback error event.
export function wrapError(model, options) {
  var error = options.error;

  options.error = function(resp) {
    model.trigger('error', model, resp, options);

    if (error || options.complete) {
      if (error) {
        error.call(options.context, model, resp, options);
      }

      if (options.complete) {
        options.complete();
      }
    }

    return Promise.reject([model, resp, options]);
  };
}
