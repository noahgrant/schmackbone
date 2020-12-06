import {identity} from './utils';

var prefilter = identity;

// override this to provide custom request options manipulation before a request
// goes out, for example, to add auth headers to the `headers` property, or to
// custom wrap the error callback in the `error` property
export function getAjaxPrefilter() {
  return prefilter;
}

export function setAjaxPrefilter(_prefilter) {
  prefilter = _prefilter;
}
