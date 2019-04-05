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

## Schmackbone.js

Schmackbone is a fork of the established MV-library [Backbone](https://github.com/jashkenas/backbone), with the View-logic and
jQuery removed. `Backbone.ajax` uses the Promise-based `window.fetch`. This all happens under the hood; you can use model methods
like `.fetch()`, `.destroy()`, and `.save()` like you would normally - you just won't be using jQuery.

#### Backbone.ajaxPrefilter

Schmackbone does offer one hook into the ajax method, `Backbone.ajaxPrefilter`, which allows you to alter the
[options object](https://github.com/noahgrant/schmackbone/blob/1e3c385be522ddb0938f1552cef9620dedd4eb0f/schmackbone.js#L1486)
passed to `Backbone.ajax` before any requests are made. Use this hook to pass custom headers like auth headers, or a custom
global error handler:

```js
// usage:
// @param {object} options object
// @return {object} modified options object
Backbone.ajaxPrefilter = (options={}) => {
  const originalErrorCallback = options.error;

  return {
    ...options,
    error: (response) => {
      if (response.status === 401) {
        // refresh auth token logic
      } else if (response.status === 429) {
        // do some rate-limiting retry logic
      }

      originalErrorCallback(response);
    },
    headers: {
      ...options.headers,
      Authorization: `Bearer ${localStorage.getItem('super-secret-auth-token')}`
    }
  };
};
```

By default, `Backbone.ajaxPrefilter` is set to the identity function.

For Backbone-related information, see [the website](https://backbonejs.org) and especially its [annotated source page](https://backbonejs.org/docs/backbone.html).
