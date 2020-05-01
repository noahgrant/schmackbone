```
                       __      __
                      /\ \    /\ \                                   __
           __      ___\ \ \/'\\ \ \____    ___     ___      __      /\_\    ____
         /'__`\   /'___\ \ , < \ \ '__`\  / __`\ /' _ `\  /'__`\    \/\ \  /',__\
   SCHM-/\ \ \.\_/\ \__/\ \ \\`\\ \ \ \ \/\ \ \ \/\ \/\ \/\  __/  __ \ \ \/\__, `\
        \ \__/.\_\ \____\\ \_\ \_\ \_,__/\ \____/\ \_\ \_\ \____\/\_\_\ \ \/\____/
         \/__/\/_/\/____/ \/_/\/_/\/___/  \/___/  \/_/\/_/\/____/\/_/\ \_\ \/___/
                                                                    \ \____/
                                                                     \/___/
 (_'______________________________________________________________________________'_)
 (_.——————————————————————————————————————————————————————————————————————————————._)
```

# Schmackbone.js

Schmackbone is a fork of the established MV-library [Backbone](https://github.com/jashkenas/backbone), with the View-logic and
jQuery removed. `Schmackbone.ajax` uses the Promise-based `window.fetch`. This all happens under the hood; you can use model methods
like `.fetch()`, `.destroy()`, and `.save()` like you would normally (see additional [Promise caveat](#requests-have-a-promise-interface) below)
&nbsp;&ndash;&nbsp;you just won't be using jQuery.

## Why?

While creating a Backbone view layer feels a little 2012, its Models and Collections are actually a very light and easy abstraction
for interacting with REST APIs. Additionally, its basic Events module make it a cinch to pub/sub your model changes to your actual
view layer, for example, your React Components. This allows for some really elegant abstractions without the heaviness of a full-blown
state manager like Redux. You can keep your UI-state local and your data-state in your models (as your single-source-of-truth), instead
of immediately denormalizing an API response as local component state. This is how the [resourcerer](https://github.com/SiftScience/resourcerer)
library employs Schmackbone.

## Practical Differences to Backbone

#### Requests have a Promise interface

All Schmackbone request methods now have a Promise interface instead of accepting jQuery-style `success` and `error` options.

```js
// before:
todoModel.save({name: 'Giving This Todo A New Name'}, {
  success: (model, response, options) => notify('Todo save succeeded!'),
  error: (model, response, options) => notify('Todo save failed :/'),
  complete: () => saveAttempts = saveAttempts + 1
});

// after
todoModel.save({name: 'Giving This Todo A New Name'})
    .then(([model, response, options]) => notify('Todo save succeeded!'))
    .catch(([model, response, options]) => notify('Todo save failed :/'))
    .then(() => saveAttempts = saveAttempts + 1);
```

Note a couple important consequences:

1. Since Promises can only resolve a single value, the callback parameters are passed via an array that can be destructured.
1. All requests _must_ have a `.catch` attached, even if the rejection is swallowed. Omitting one risks an uncaught Promise rejection exception if the request fails.
1. The `.create` method no longer returns the added model; it returns the promise instead.

#### [qs](https://github.com/ljharb/qs) Dependency

While jQuery was no longer necessary, we could not replace it entirely with native javascript: we added query string stringifying
functionality via the small-footprint [qs](https://github.com/ljharb/qs) library. If you use a bundler, you won't have to worry
about this; if you use Schmackbone in the browser, you'll need to remember to add the `qs` script tag above Schmackbone's (order with
underscore's script is irrelevant).

#### Schmackbone.ajaxPrefilter

Schmackbone does offer one hook into the ajax method, `Schmackbone.ajaxPrefilter`, which allows you to alter the
[options object](https://github.com/noahgrant/schmackbone/blob/1e3c385be522ddb0938f1552cef9620dedd4eb0f/schmackbone.js#L1486)
passed to `Schmackbone.ajax` before any requests are made. Use this hook to pass custom headers like auth headers, or a custom
global error handler:

```js
// usage:
// @param {object} options object
// @return {object} modified options object
Schmackbone.ajaxPrefilter = (options={}) => ({
  ...options,
  // if you want to default all api requests to json
  contentType: 'application/json',
  error: (response) => {
    if (response.status === 401) {
      // refresh auth token logic
    } else if (response.status === 429) {
      // do some rate-limiting retry logic
    }

    return options.error(response);
  },
  headers: {
    ...options.headers,
    Authorization: `Bearer ${localStorage.getItem('super-secret-auth-token')}`
  }
});
```

By default, `Schmackbone.ajaxPrefilter` is set to the identity function.

#### Misc

* Note that Schmackbone uses ES2015 in its source and does no transpiling. This is mostly important for those who want
  to use it directly in the browser, in which case you'll need to transpile it yourself or only support modern browsers.
  Anyone using a bundler can transpile this along with the rest of their code.

For Backbone-related information, see [the website](https://backbonejs.org) and especially its [annotated source page](https://backbonejs.org/docs/backbone.html).
