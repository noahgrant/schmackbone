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

Schmackbone is a lighter, modernized fork of the established MV-library [Backbone](https://github.com/jashkenas/backbone), with the View-logic and
jQuery removed along with its support for legacy browsers. So it's really just an M-library.

Its ajax requests are now native and promise-based, and its components are modularized so you can use what you need and tree-shake the rest.

## Why?

While creating a Backbone view layer feels a little 2012, its Models and Collections are actually a very light and easy abstraction
for interacting with REST APIs. Additionally, its basic Events module make it a cinch to pub/sub your model changes to your actual
view layer, for example, your React Components. This allows for some really elegant abstractions without the heaviness of a full-blown
state manager like Redux. You can keep your UI-state local and your data-state (the 'state' of the data that is represented in your API).

This is how the [resourcerer](https://github.com/noahgrant/resourcerer) library employs Schmackbone.

## Practical Differences to Backbone

### Underscore methods are now _opt-in_

Backbone automatically adds the bulk of the underscore library methods to its [Model](https://backbonejs.org/#Model-Underscore-Methods)/[Collection](https://backbonejs.org/#Collection-Underscore-Methods) prototypes. But nearly all of them are unnecessary these days. Schmackbone leaves these out by default. However, if you want to add these back, just import the `add_underscore_methods` script to your application:

```js
// your-app.js
import 'schmackbone/add_underscore_methods';
```

### Modularized

```js
// before, with webpack shimming via https://github.com/webpack-contrib/imports-loader:
import Backbone from 'backbone';

// after:
import * as Schmackbone from 'schmackbone';
// or
import {Model} from 'schmackbone';
```

### Model, Collection, and Router are native Javascript classes

```js
// before:
var MyModel = Model.extend({url: () => '/foo'});

// after:
class MyModel extends Model {
  url = () => '/foo'
}
```

### Reserved instance properties now static properties

Due to the way instance properties are instantiated in subclasses (not until _after_ the superclass has been instantiated), many of the reserved instance properties in Schmackbone have been moved to static properties:

```js
// before:
var MyModel = Model.extend({
  defaults: {
    one: 1,
    two: 2
  },
  
  cidPrefix: 'm',
  
  idAttribute: '_id',
  
  url: () => '/foo'
});


// after:
class MyModel extends Model {
  static defaults = {
    one: 1,
    two: 2
  }
  
  static cidPrefix = 'm'
  
  static idAttribute = '_id'
  
  url() => '/foo'
});
```

Notes:
* For Models, `defaults`, `idAttribute`, and `cidPrefix` are static properties. `defaults` can optionally be a static function.
* For Collections, `model` and `comparator` properties are now static, but if they need to be overridden in an instance, they can do so via the `options` object in instantiation:

```js
class MyCollection extends Collection {
  static comparator = 'created_at'
  static model = MyModel
}

const overrideCollection = new MyCollection([], {comparator: 'updated_at', model: MyModel2});
```

* For Routers, the `routes` property must now be a function:

```js
class MyRouter extends Router {
  // previously, `routes` could be either an object or a function. it must now be a function
  routes() {
    return {
      '(/)': home
      // ...
    }
  }
}
```

* `url` (Model/Collection) and `urlRoot` (Model) remain instance properties, as they (1) often depend on the instance and (2) are not utilized during instantiation

### Requests have a Promise interface

All Schmackbone request methods use `window.fetch` under the hood and so now have a Promise interface, instead of accepting jQuery-style `success` and `error` options.

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

### Legacy Browser/Server Support Dropped

Much of the code from the original Backbone library has remained in tact, but it has been ported to ESNext and pieces targeting legacy browsers and servers have been removed. Accordingly, there is no longer any notion of an `emulateHTTP` or `emulateJSON` sync option, nor responding to routes via hashchanges ([`pushState`](https://backbonejs.org/#History-start) is _always_ supported).

### qs Dependency

While jQuery was no longer necessary, we could not replace it entirely with native javascript: we added query string stringifying
functionality via the small-footprint [qs](https://github.com/ljharb/qs) library. If you use a bundler, you won't have to worry
about this; if you use Schmackbone in the browser, you'll need to remember to add the `qs` script tag above Schmackbone's (order with
underscore's script is irrelevant).

### setAjaxPrefilter

Schmackbone offers one hook into its fetch requests: `setAjaxPrefilter`. It allows you to alter the
[options object](https://github.com/noahgrant/schmackbone/blob/82bf932e28e07c3c90a949a1500dcbb0344610f6/lib/sync.js#L89)
passed to `window.fetch` before any requests are made. Use this hook to pass custom headers like auth headers, or a custom
global error handler:

```js
import {setAjaxPrefilter} from 'schmackbone';

// usage:
// @param {object} options object
// @return {object} modified options object
const ajaxPrefilter = (options={}) => ({
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

setAjaxPrefilter(ajaxPrefilter);
```

By default, the `ajaxPrefilter` function is set to the identity function.

### Misc

* Note that Schmackbone uses ES2015 in its source and does no transpiling&mdash;including `import`/`export` (Local babel configuration is for testing, only). Unlike Backbone, whose legacy monolith used UMD syntax and could be used directly in the browser, Schmackbone can be used only in modern browsers via the `type="module"` script MIME-type or via a bundler like webpack that handles module transforms.

* For Backbone-related information, see [the website](https://backbonejs.org) and especially its [annotated source page](https://backbonejs.org/docs/backbone.html).
