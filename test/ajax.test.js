import * as Config from '../lib/config';
import * as Sync from '../lib/sync';

import Model from '../lib/model';

class TestModel extends Model {
  url = () => '/test_path'
}

const originalAjax = Sync.ajax;

describe('ajax', () => {
  beforeEach(() => {
    // overrides test-suite-wide ajax stub, because here we stub window.fetch
    Sync.ajax = originalAjax;
    jest.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
    ));
  });

  afterEach(() => {
    window.fetch.mockRestore();
  });

  test('adds a \'response\' property in the sync method', () => {
    var options = {};

    jest.spyOn(Sync, 'ajax').mockReturnValue();
    Sync.default('fetch', new TestModel(), options);
    expect(options.response).toEqual({});
    Sync.ajax.mockRestore();
  });

  test('appends query params to the url if there are any and if a GET', async() => {
    await new TestModel().fetch({data: {zorah: 'thefung', noah: 'thegrant'}});

    expect(window.fetch.mock.calls[0][0]).toEqual('/test_path?zorah=thefung&noah=thegrant');
  });

  test('can pass custom headers', async() => {
    await new TestModel().fetch({headers: {'Coffee Region': 'Ethiopia'}});

    expect(window.fetch.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
      'Coffee Region': 'Ethiopia'
    });
  });

  describe('has a ajaxPrefilter function to alter options', () => {
    test('that defaults to the identity function', async() => {
      var options = {headers: {'Test Header': 'sometestheadervalue'}};

      await new TestModel().fetch(options);

      expect(options).toEqual(Config.getAjaxPrefilter()(options));

      expect(window.fetch.mock.calls[0][1].headers).toEqual({
        Accept: 'application/json',
        'Test Header': 'sometestheadervalue'
      });
    });

    test('that provides a hook for custom options meddling', async() => {
      var errorSpy = jest.fn();

      Config.setAjaxPrefilter(jest.fn((options) => ({
        ...options,
        error: errorSpy,
        headers: {...options.headers, Authorization: 'Bearer SECRET'}
      })));
      jest.spyOn(Sync, 'default');

      await new TestModel().fetch();

      expect(Sync.default.mock.calls[0][0].error).not.toBeDefined();
      expect(window.fetch.mock.calls[0][1].headers.Authorization).toBeDefined();
      expect(window.fetch.mock.calls[0][1].error).toEqual(errorSpy);
      Sync.default.mockRestore();
      Config.setAjaxPrefilter((_x) => _x);
    });
  });

  describe('passes \'Content-Type\' headers', () => {
    test('if a body is passed for an http type that accepts a body', async() => {
      await new TestModel().fetch({data: {zoah: 'thefungrant'}});
      // no body, because this is a GET
      expect(window.fetch.mock.calls[0][1].headers['Content-Type']).not.toBeDefined();

      await new TestModel().save({zoah: 'thefungrant'});
      // as a save call, backbone should add app json to the body
      expect(window.fetch.mock.calls[1][1].headers['Content-Type']).toEqual('application/json');

      // as a destroy call, this has no body
      await new TestModel({id: 'zoah', zoah: 'thefungrant'}).destroy();
      expect(window.fetch.mock.calls[2][1].headers['Content-Type']).not.toBeDefined();
    });

    test('that defaults to www-form-urlencoded', async() => {
      // a manual fetch with a POST will use the defaults
      await new TestModel().fetch({type: 'POST', data: {zoah: 'thefungrant'}});
      expect(window.fetch.mock.calls[0][1].headers['Content-Type'])
          .toEqual('application/x-www-form-urlencoded; charset=UTF-8');

      // can pass custom content type
      await new TestModel().save({zoah: 'thefungrant'}, {contentType: 'application/text'});
      expect(window.fetch.mock.calls[1][1].headers['Content-Type']).toEqual('application/text');
    });
  });

  describe('stringifies body data', () => {
    test('if it exists, is for an http type that accepts a body, and is ' +
       'not already a string', async() => {
      await new TestModel().fetch({data: {zorah: 'thefung', noah: 'thegrant'}});
      // no body, because this is a GET
      expect(window.fetch.mock.calls[0][1].body).not.toBeDefined();

      await new TestModel().fetch({type: 'HEAD', data: {zorah: 'thefung', noah: 'thegrant'}});
      // no body, because this is a HEAD
      expect(window.fetch.mock.calls[1][1].body).not.toBeDefined();

      await new TestModel().fetch({type: 'POST'});
      // no body, so no body sent
      expect(window.fetch.mock.calls[2][1].body).not.toBeDefined();

      await new TestModel().save({zorah: 'thefung', noah: 'thegrant'});
      // body should get JSON-stringified by backbone
      expect(window.fetch.mock.calls[3][1].body).toEqual(
        '{"zorah":"thefung","noah":"thegrant"}'
      );
    });

    test('query-param stringifies by default, or JSON-stringifies for JSON mime type data',
      async() => {
        await new TestModel().fetch({type: 'POST', data: {zorah: 'thefung', noah: 'thegrant'}});
        expect(window.fetch.mock.calls[0][1].body).toEqual('zorah=thefung&noah=thegrant');

        await new TestModel().fetch({
          type: 'POST',
          contentType: 'application/json',
          data: {zorah: 'thefung', noah: 'thegrant'}
        });

        expect(window.fetch.mock.calls[1][1].body).toEqual('{"zorah":"thefung","noah":"thegrant"}');
      });
  });

  test('copies the response properties to the added options.response', async() => {
    var options = {};

    await Sync.default('fetch', new TestModel(), options);

    expect(options.response.status).toEqual(200);
    expect(options.response.ok).toBe(true);
    expect(!!options.response.json).toBe(true);
  });

  test('does not throw an error for malformed json', async() => {
    var successSpy = jest.fn();

    // ie 204 content, we catch and pass an empty object
    window.fetch.mockImplementation(() => Promise.resolve(
      new Response('', {type: 'application/json'}),
      {status: 204}
    ));

    await new TestModel().fetch({success: successSpy});

    expect(successSpy.mock.calls[0][1]).toEqual({});
  });

  test('calls success and error callbacks as appropriate, with the correct params',
    async() => {
      var successSpy = jest.fn(),
          errorSpy = jest.fn(),
          model = new TestModel(),
          errorResponse = new Response(
            new Blob([{test: 'response!'}], {type: 'application/json'}),
            {status: 400}
          );

      await model.fetch({success: successSpy, error: errorSpy});

      expect(successSpy.mock.calls[0][0]).toEqual(model);
      expect(successSpy.mock.calls[0][1]).toEqual({});
      expect(successSpy.mock.calls[0][2]).toEqual(expect.any(Object));
      expect(!!successSpy.mock.calls[0][2].response).toBe(true);

      // now test error
      window.fetch.mockImplementation(() => Promise.resolve(errorResponse));

      await model.fetch({success: successSpy, error: errorSpy}).catch(() => {});

      expect(errorSpy.mock.calls[0][0]).toEqual(model);
      expect(errorSpy.mock.calls[0][1]).toEqual(expect.any(Object));
      expect(errorSpy.mock.calls[0][2]).toEqual(expect.any(Object));
    });

  test('calls a \'complete\' callback regardless of request outcome', async() => {
    var completeSpy = jest.fn(),
        errorResponse = new Response(
          new Blob([{test: 'response!'}], {type: 'application/json'}),
          {status: 400}
        );

    // first for success calls
    await new TestModel().fetch({complete: completeSpy});

    expect(completeSpy).toHaveBeenCalledTimes(1);

    // now test error
    completeSpy = jest.fn();
    window.fetch.mockImplementation(() => Promise.resolve(errorResponse));

    await new TestModel().fetch({complete: completeSpy}).catch(() => {});
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  test('calls success and error promise callbacks as appropriate, with the correct params',
    async() => {
      var successSpy = jest.fn(),
          errorSpy = jest.fn(),
          model = new TestModel(),
          errorResponse = new Response(
            new Blob([{test: 'response!'}], {type: 'application/json'}),
            {status: 400}
          );

      await model.fetch().then(successSpy).catch(errorSpy);

      expect(successSpy.mock.calls[0][0]).toEqual([model, {}, expect.any(Object)]);

      // now test error
      window.fetch.mockImplementation(() => Promise.resolve(errorResponse));
      await model.fetch().then(successSpy).catch(errorSpy);

      expect(errorSpy.mock.calls[0][0]).toEqual([model, expect.any(Object), expect.any(Object)]);
    });

  test('calls a \'complete\' promise-based callback regardless of request outcome', async() => {
    var completeSpy = jest.fn(),
        errorResponse = new Response(
          new Blob([{test: 'response!'}], {type: 'application/json'}),
          {status: 400}
        );

    // first for success calls
    await new TestModel().fetch().catch(() => {}).then(completeSpy);

    expect(completeSpy).toHaveBeenCalledTimes(1);

    // now test error
    completeSpy = jest.fn();
    window.fetch.mockImplementation(() => Promise.resolve(errorResponse));

    await new TestModel().fetch().catch(() => {}).then(completeSpy);

    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
