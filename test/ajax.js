((QUnit, sinon) => {
  const TestModel = Backbone.Model.extend({url: () => '/test_path'});
  const originalAjax = Backbone.ajax.bind(Backbone);
  var waitsFor;

  QUnit.module('Backbone.ajax', (hooks) => {
    hooks.beforeEach(() => {
      ({waitsFor} = QUnit.config.current.testEnvironment);
      // overrides test-suite-wide ajax stub, because here we stub window.fetch
      Backbone.ajax = originalAjax;
      sinon.stub(window, 'fetch').callsFake(() => Promise.resolve(
        new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
      ));
    });

    hooks.afterEach((assert) => {
      var done = assert.async();

      // wait a frame to ensure all mocked promises run to completion
      window.requestAnimationFrame(() => {
        sinon.restore();
        done();
      });
    });

    QUnit.test('adds a \'response\' property in the sync method', (assert) => {
      var options = {};

      sinon.spy(Backbone, 'ajax');
      Backbone.sync('fetch', new TestModel(), options);
      assert.deepEqual(options.response, {});
    });

    QUnit.test('appends query params to the url if there are any and if a GET', (assert) => {
      new TestModel().fetch({
        data: {
          zorah: 'thefung',
          noah: 'thegrant'
        }
      });

      assert.equal(
        window.fetch.lastCall.args[0],
        '/test_path?zorah=thefung&noah=thegrant'
      );
    });

    QUnit.test('can pass custom headers', (assert) => {
      new TestModel().fetch({headers: {'Coffee Region': 'Ethiopia'}});

      assert.deepEqual(window.fetch.lastCall.args[1].headers, {
        'Accept': 'application/json',
        'Coffee Region': 'Ethiopia'
      });
    });

    QUnit.module('has a ajaxPrefilter function to alter options', () => {
      QUnit.test('that defaults to the identity function', (assert) => {
        var options = {headers: {'Test Header': 'sometestheadervalue'}};

        sinon.spy(Backbone, 'ajaxPrefilter');
        sinon.spy(Backbone, 'ajax');

        new TestModel().fetch(options);

        assert.equal(
          Backbone.ajaxPrefilter.lastCall.args[0],
          Backbone.ajax.lastCall.args[0]
        );

        assert.deepEqual(window.fetch.lastCall.args[1].headers, {
          'Accept': 'application/json',
          'Test Header': 'sometestheadervalue'
        });
      });

      QUnit.test('that provides a hook for custom options meddling', (assert) => {
        var errorSpy = sinon.spy();

        sinon.stub(Backbone, 'ajaxPrefilter').callsFake((options) => _.extend({}, options, {
          error: errorSpy,
          headers: _.extend({}, options.headers, {Authorization: 'Bearer SECRET'})
        }));
        sinon.spy(Backbone, 'ajax');
        sinon.spy(Backbone, 'sync');

        new TestModel().fetch();

        assert.notOk(Backbone.ajax.lastCall.args[0].headers);
        assert.notOk(Backbone.sync.lastCall.args[0].error);
        assert.ok(window.fetch.lastCall.args[1].headers.Authorization);
        assert.equal(window.fetch.lastCall.args[1].error, errorSpy);

        assert.equal(
          Backbone.ajaxPrefilter.lastCall.args[0],
          Backbone.ajax.lastCall.args[0]
        );
      });
    });

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
      QUnit.test('if it exists, is for an http type that accepts a body, and is not already a string', (assert) => {
        new TestModel().fetch({data: {zorah: 'thefung', noah: 'thegrant'}});
        // no body, because this is a GET
        assert.notOk(!!window.fetch.lastCall.args[1].body);

        new TestModel().fetch({type: 'HEAD', data: {zorah: 'thefung', noah: 'thegrant'}});
        // no body, because this is a HEAD
        assert.notOk(!!window.fetch.lastCall.args[1].body);

        new TestModel().fetch({type: 'POST'});
        // no body, so no body sent
        assert.notOk(!!window.fetch.lastCall.args[1].body);

        sinon.spy(Backbone, 'ajax');

        new TestModel().save({zorah: 'thefung', noah: 'thegrant'});
        // body should get JSON-stringified by backbone
        assert.equal(
          Backbone.ajax.lastCall.args[0].data,
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

    QUnit.test('copies the response properties to the added options.response', async (assert) => {
      var options = {},
          done = assert.async();

      Backbone.sync('fetch', new TestModel(), options);
      await waitsFor(() => 'status' in options.response);

      assert.equal(options.response.status, 200);
      assert.ok(options.response.ok);
      assert.ok(!!options.response.json);

      done();
    });

    QUnit.test('does not throw an error for malformed json', async (assert) => {
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

    QUnit.test('calls success and error callbacks as appropriate, with the correct params', async (assert) => {
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

    QUnit.test('calls a \'complete\' callback regardless of request outcome', async (assert) => {
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
  });
})(QUnit, sinon);
