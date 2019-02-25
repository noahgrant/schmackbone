const _ = require('underscore');
const Backbone = require('backbone');
const {stringify} = require('qs');

const backboneSync = Backbone.sync.bind(Backbone);

const MIME_TYPE_JSON = 'application/json';
const MIME_TYPE_DEFAULT = 'application/x-www-form-urlencoded; charset=UTF-8';

Backbone.sync = (method, model, options) => {
  // Backbone creates an `xhr` property on the options object for its default
  // xhr request made via jquery. Using window.fetch this becomes just a
  // reference to a Promise, and not very useful. So here we attach a response
  // object that we mutate directly with the request's response object. Note
  // that we the original options object passed to fetch/save/destroy calls (and
  // kept in closure) is not the same one passed to Backbone.ajax. It's a copy,
  // and so we must modify the response object directly for it to be passed through.
  options.response = {};

  return backboneSync(method, model, options);
};

// override this to provide custom request options manipulation before a request
// goes out, for example, to add auth headers to the `headers` property, or to
// custom wrap the error callback in the `error` property
Backbone.ajaxPrefilter = _.identity;

/**
 * This is our jquery-less override to Backbone's ajax functionality. It mirrors
 * jquery's $.ajax in a few ways, for example, the `hasBodyContent` to
 * conditionally add Content-Type headers, and to default to
 * x-www-form-urlencoded data. It also has a `complete` callback that we can
 * eventually use in a Promise.finally when we don't need to polyfill that. Its
 * success and error handlers have similar signatures (via Backbone) to their
 * jquery counterparts. Of course, the main difference with jquery is that we're
 * using promises via the native `window.fetch`. This also auto-stringifies
 * application/json body data.
 */
Backbone.ajax = function(options = {}) {
  var hasData = !!_.size(options.data),
      hasBodyContent = !/^(?:GET|HEAD)$/.test(options.type) && hasData;

  if (options.type === 'GET' && hasData) {
    options.url += (options.url.indexOf('?') > -1 ? '&' : '?') + stringify(options.data);
  }

  options = Backbone.ajaxPrefilter(options);

  return window.fetch(options.url, {
    ...options,
    method: options.type,
    headers: {
      Accept: MIME_TYPE_JSON,
      // mock jquery behavior here as we migrate off of it:
      //  * only set contentType header if a write request and if there is body data
      //  * default to x-www-form-urlencoded. Backbone will pass application/json
      //    and JSON-stringify options.data for save/destroy calls, but we'll do
      //    it here for our own POST requests via fetch calls that Backbone doesn't cover
      ...hasBodyContent ? {'Content-Type': options.contentType || MIME_TYPE_DEFAULT} : {},
      ...options.headers
    },
    ...hasBodyContent ? {
      body: typeof options.data === 'string' ?
        options.data :
        options.contentType === MIME_TYPE_JSON ?
          JSON.stringify(options.data) :
          stringify(options.data)
    } : {}
  }).then((res) => {
    // make a copy of the response object and place it into the options
    // `response` property we created before Backbone.sync. This will make it
    // available in our success callbacks. Note that our error callbacks will
    // have it, as well, but they will also get it directly from the rejected
    // promise. we use _.extend instead of Object.assign because none of the
    // Response properties are enumerable
    _.extend(options.response, res);

    // catch block here handles the case where the response isn't valid json,
    // like for example a 204 no content
    return res.json()['catch'](() => ({}))
      .then((json) => res.ok ? json : Promise.reject(_.extend({}, res, {json})));
  }).then(options.success, options.error).then(options.complete || _.noop);
};
