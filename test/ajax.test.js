import * as Config from '../lib/config.js';
import * as Sync from '../lib/sync.js';

import Model from '../lib/model.js';

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

  /*
  QUnit.module('stringifies body data', () => {
    QUnit.test('if it exists, is for an http type that accepts a body, and is ' +
       'not already a string', (assert) => {
      new TestModel().fetch({data: {zorah: 'thefung', noah: 'thegrant'}});
      // no body, because this is a GET
      assert.notOk(!!window.fetch.lastCall.args[1].body);

      new TestModel().fetch({type: 'HEAD', data: {zorah: 'thefung', noah: 'thegrant'}});
      // no body, because this is a HEAD
      assert.notOk(!!window.fetch.lastCall.args[1].body);

      new TestModel().fetch({type: 'POST'});
      // no body, so no body sent
      assert.notOk(!!window.fetch.lastCall.args[1].body);

      sinon.spy(Sync, 'ajax');

      new TestModel().save({zorah: 'thefung', noah: 'thegrant'});
      // body should get JSON-stringified by backbone
      assert.equal(
        Sync.ajax.lastCall.args[0].data,
        '{"zorah":"thefung","noah":"thegrant"}'
      );
      // and then it just gets passed directly
      assert.equal(
        window.fetch.lastCall.args[1].body,
        '{"zorah":"thefung","noah":"thegrant"}'
      );
    });

    QUnit.test('query-param stringifies by default, or JSON-stringifies for JSON mime type data',
      (assert) => {
        new TestModel().fetch({type: 'POST', data: {zorah: 'thefung', noah: 'thegrant'}});
        assert.equal(window.fetch.lastCall.args[1].body, 'zorah=thefung&noah=thegrant');

        new TestModel().fetch({
          type: 'POST',
          contentType: 'application/json',
          data: {zorah: 'thefung', noah: 'thegrant'}
        });

        assert.equal(
          window.fetch.lastCall.args[1].body,
          '{"zorah":"thefung","noah":"thegrant"}'
        );
      });
  });

  QUnit.test('copies the response properties to the added options.response', async(assert) => {
    var options = {},
        done = assert.async();

    Sync.default('fetch', new TestModel(), options);
    await waitsFor(() => 'status' in options.response);

    assert.equal(options.response.status, 200);
    assert.ok(options.response.ok);
    assert.ok(!!options.response.json);

    done();
  });

  QUnit.test('does not throw an error for malformed json', async(assert) => {
    var successSpy = sinon.spy(),
        done = assert.async();

    // ie 204 content, we catch and pass an empty object
    window.fetch.callsFake(() => Promise.resolve(
      new Response('', {type: 'application/json'}),
      {status: 204}
    ));

    new TestModel().fetch({success: successSpy});
    await waitsFor(() => successSpy.callCount);

    assert.propEqual(successSpy.lastCall.args[1], {});
    done();
  });

  QUnit.test('calls success and error callbacks as appropriate, with the correct params',
    async(assert) => {
      var successSpy = sinon.spy(),
          errorSpy = sinon.spy(),
          model = new TestModel(),
          errorResponse = new Response(
            new Blob([{test: 'response!'}], {type: 'application/json'}),
            {status: 400}
          ),
          done = assert.async();

      model.fetch({success: successSpy, error: errorSpy});
      await waitsFor(() => successSpy.callCount);

      assert.equal(successSpy.lastCall.args[0], model);
      assert.propEqual(successSpy.lastCall.args[1], {});
      assert.ok(typeof successSpy.lastCall.args[2] === 'object');
      assert.ok(!!successSpy.lastCall.args[2].response);

      // now test error
      window.fetch.callsFake(() => Promise.resolve(errorResponse));

      model.fetch({success: successSpy, error: errorSpy});
      await waitsFor(() => errorSpy.callCount);

      assert.equal(errorSpy.lastCall.args[0], model);
      assert.propEqual(errorSpy.lastCall.args[1], _.extend({}, errorResponse, {json: {}}));
      assert.ok(typeof successSpy.lastCall.args[2] === 'object');

      done();
    });

  QUnit.test('calls a \'complete\' callback regardless of request outcome', async(assert) => {
    var completeSpy = sinon.spy(),
        errorResponse = new Response(
          new Blob([{test: 'response!'}], {type: 'application/json'}),
          {status: 400}
        ),
        done = assert.async();

    // first for success calls
    new TestModel().fetch({complete: completeSpy});
    await waitsFor(() => completeSpy.callCount);

    assert.equal(completeSpy.callCount, 1);

    // now test error
    completeSpy = sinon.spy();
    window.fetch.callsFake(() => Promise.resolve(errorResponse));

    new TestModel().fetch({complete: completeSpy});
    await waitsFor(() => completeSpy.callCount);

    assert.equal(completeSpy.callCount, 1);
    done();
  });
  */
});
