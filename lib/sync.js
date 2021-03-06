import {extend, result} from 'underscore';

import {getAjaxPrefilter} from './config.js';
import {stringify} from 'qs';
import {urlError} from './utils.js';

// Schmackbone.sync
// -------------

// Override this function to change the manner in which Schmackbone persists
// models to the server. You will be passed the type of request, and the
// model in question. By default, makes a RESTful Ajax request
// to the model's `url()`. Some possible customizations could be:
//
// * Use `setTimeout` to batch rapid-fire updates into a single request.
// * Send up the models as XML instead of JSON.
// * Persist models via WebSockets instead of Ajax.
//
// Map from CRUD to HTTP for our default `Schmackbone.sync` implementation.
var methodMap = {
  create: 'POST',
  update: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  read: 'GET'
};

export default function(method, model, options={}) {
  var type = methodMap[method],
      // Default JSON-request options.
      params = {type, dataType: 'json'},
      xhr;

  // Schmackbone creates an `xhr` property on the options object for its default
  // xhr request made via jquery. Using window.fetch this becomes just a
  // reference to a Promise, and not very useful. So here we attach a response
  // object that we mutate directly with the request's response object. Note
  // that we the original options object passed to fetch/save/destroy calls (and
  // kept in closure) is not the same one passed to Schmackbone.ajax. It's a copy,
  // and so we must modify the response object directly for it to be passed through.
  options.response = {};

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = result(model, 'url') || urlError();
  }

  // Ensure that we have the appropriate request data.
  if (!options.data && model && ['create', 'patch', 'update'].includes(method)) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(options.attrs || model.toJSON(options));
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET') {
    params.processData = false;
  }

  // Make the request, allowing the user to override any Ajax options.
  xhr = options.xhr = ajax({...params, ...options});

  model.trigger('request', model, xhr, options);

  return xhr;
}

const MIME_TYPE_JSON = 'application/json';
const MIME_TYPE_DEFAULT = 'application/x-www-form-urlencoded; charset=UTF-8';

/**
 * This is our jquery-less override to Schmackbone's ajax functionality. It mirrors
 * jquery's $.ajax in a few ways, for example, the `hasBodyContent` to
 * conditionally add Content-Type headers, and to default to
 * x-www-form-urlencoded data. It also has a `complete` callback that we can
 * eventually use in a Promise.finally when we don't need to polyfill that. Its
 * success and error handlers have similar signatures (via Schmackbone) to their
 * jquery counterparts. Of course, the main difference with jquery is that we're
 * using promises via the native `window.fetch`. This also auto-stringifies
 * application/json body data.
 */
export function ajax(options) {
  var hasData = !!Object.keys(options.data || {}).length,
      hasBodyContent = !/^(?:GET|HEAD)$/.test(options.type) && hasData;

  if (options.type === 'GET' && hasData) {
    options.url += (options.url.indexOf('?') > -1 ? '&' : '?') + stringify(options.data);
  }

  options = getAjaxPrefilter()(options);

  return window.fetch(
    options.url,
    {
      ...options,
      method: options.type,
      headers: {
        Accept: MIME_TYPE_JSON,
        // mock jquery behavior here as we migrate off of it:
        //  * only set contentType header if a write request and if there is body data
        //  * default to x-www-form-urlencoded. Schmackbone will pass application/json
        //    and JSON-stringify options.data for save/destroy calls, but we'll do
        //    it here for our own POST requests via fetch calls that Schmackbone doesn't cover
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
    }
  ).then((res) => {
    // make a copy of the response object and place it into the options
    // `response` property we created before Schmackbone.sync. This will make it
    // available in our success callbacks. Note that our error callbacks will
    // have it, as well, but they will also get it directly from the rejected
    // promise. we use _.extend instead of Object.assign because none of the
    // Response properties are enumerable
    extend(options.response, res);

    // catch block here handles the case where the response isn't valid json,
    // like for example a 204 no content
    return res.json().catch(() => ({}))
        .then((json) => res.ok ? json : Promise.reject(extend({}, res, {json})));
  }).then(options.success, options.error);
}
