import * as Config from '../lib/config.js';
import * as Sync from '../lib/sync.js';

import Model from '../lib/model.js';
import {waitsFor} from './test-utils.js';

class TestModel extends Model {
  url = () => '/test_path'
}

const originalAjax = Sync.ajax;

describe('ajax', () => {
  beforeEach(() => {
    // overrides test-suite-wide ajax stub, because here we stub window.fetch
    Sync.ajax = originalAjax;
    spyOn(window, 'fetch').and.callFake(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
    ));
  });

  afterEach(async(done) => {
    // wait a frame to ensure all mocked promises run to completion
    window.requestAnimationFrame(done);
  });

  it('adds a \'response\' property in the sync method', () => {
    var options = {};

    spyOn(Sync, 'ajax');
    Sync.default('fetch', new TestModel(), options);
    expect(options.response).toEqual({});
  });

  it('appends query params to the url if there are any and if a GET', () => {
    new TestModel().fetch({data: {zorah: 'thefung', noah: 'thegrant'}});

    expect(window.fetch.lastCall.args[0]).toEqual('/test_path?zorah=thefung&noah=thegrant');
  });

  it('can pass custom headers', () => {
    new TestModel().fetch({headers: {'Coffee Region': 'Ethiopia'}});

    expect(window.fetch.lastCall.args[1].headers).toEqual({
      Accept: 'application/json',
      'Coffee Region': 'Ethiopia'
    });
  });

  describe('has a ajaxPrefilter function to alter options', () => {
    it('that defaults to the identity function', () => {
      var options = {headers: {'Test Header': 'sometestheadervalue'}};

      new TestModel().fetch(options);

      expect(options).toEqual(Config.getAjaxPrefilter()(options));

      expect(window.fetch.lastCall.args[1].headers).toEqual({
        Accept: 'application/json',
        'Test Header': 'sometestheadervalue'
      });
    });

    it('that provides a hook for custom options meddling', () => {
      var errorSpy = jasmine.createSpy('error');

      Config.setAjaxPrefilter(jasmine.createSpy('prefilter').and.callFake((options) => ({
        ...options,
        error: errorSpy,
        headers: {...options.headers, Authorization: 'Bearer SECRET'}
      })));
      spyOn(Sync, 'default');

      new TestModel().fetch();

      expect(Sync.default.lastCall.args[0].error).not.toBeDefined();
      expect(window.fetch.lastCall.args[1].headers.Authorization).toBeDefined();
      expect(window.fetch.lastCall.args[1].error).toEqual(errorSpy);
    });
  });

  /*
  QUnit.module('passes \'Content-Type\' headers', () => {
    QUnit.test('if a body is passed for an http type that accepts a body', (assert) => {
      new TestModel().fetch({data: {zoah: 'thefungrant'}});
      // no body, because this is a GET
      assert.notOk(window.fetch.lastCall.args[1].headers['Content-Type']);

      new TestModel().save({zoah: 'thefungrant'});
      // as a save or destroy call, backbone should add app json to the body
      assert.equal(window.fetch.lastCall.args[1].headers['Content-Type'], 'application/json');

      new TestModel({zoah: 'thefungrant'}).destroy();
      assert.equal(window.fetch.lastCall.args[1].headers['Content-Type'], 'application/json');
    });

    QUnit.test('that defaults to www-form-urlencoded', (assert) => {
      // a manual fetch with a POST will use the defaults
      new TestModel().fetch({type: 'POST', data: {zoah: 'thefungrant'}});
      assert.equal(
        window.fetch.lastCall.args[1].headers['Content-Type'],
        'application/x-www-form-urlencoded; charset=UTF-8'
      );

      // can pass custom content type
      new TestModel().save({zoah: 'thefungrant'}, {contentType: 'application/text'});
      assert.equal(
        window.fetch.lastCall.args[1].headers['Content-Type'],
        'application/text'
      );
    });
  });

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
