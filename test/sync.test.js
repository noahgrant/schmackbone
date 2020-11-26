import * as Sync from '../lib/sync';

import Collection from '../lib/collection';
import Model from '../lib/model';

class Library extends Collection {
  url() {
    return '/library';
  }
}

describe('Schmackbone.sync', () => {
  var library,
      attrs = {
        title: 'The Tempest',
        author: 'Bill Shakespeare',
        length: 123
      };

  beforeEach(() => {
    library = new Library;
    jest.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(new Blob([{test: 'response!'}], {type: 'application/json'}), {status: 200})
    ));
  });

  afterEach(() => {
    window.fetch.mockRestore();
  });

  test('read', async() => {
    await library.fetch();

    expect(window.fetch.mock.calls[0][0]).toEqual('/library');
    expect(window.fetch.mock.calls[0][1].type).toEqual('GET');
    expect(window.fetch.mock.calls[0][1].dataType).toEqual('json');
    expect(window.fetch.mock.calls[0][1].data).not.toBeDefined();
  });

  test('passing data', async() => {
    await library.fetch({data: {a: 'a', one: 1}});

    expect(window.fetch.mock.calls[0][0]).toEqual('/library?a=a&one=1');
  });

  test('create', async() => {
    await library.create(attrs, {wait: false});

    expect(window.fetch.mock.calls[0][0]).toEqual('/library');
    expect(window.fetch.mock.calls[0][1].type).toEqual('POST');
    expect(window.fetch.mock.calls[0][1].dataType).toEqual('json');
    expect(JSON.parse(window.fetch.mock.calls[0][1].data)).toEqual({
      title: 'The Tempest',
      author: 'Bill Shakespeare',
      length: 123
    });
  });

  test('update', async() => {
    library.add(attrs);
    await library.at(0).save({id: '1-the-tempest', author: 'William Shakespeare'});

    expect(window.fetch.mock.calls[0][0]).toEqual('/library/1-the-tempest');
    expect(window.fetch.mock.calls[0][1].type).toEqual('PUT');
    expect(window.fetch.mock.calls[0][1].dataType).toEqual('json');
    expect(JSON.parse(window.fetch.mock.calls[0][1].data)).toEqual({
      id: '1-the-tempest',
      title: 'The Tempest',
      author: 'William Shakespeare',
      length: 123
    });
  });

  test('read model', async() => {
    library.add(attrs);
    await library.at(0).save({id: '2-the-tempest', author: 'Tim Shakespeare'});
    await library.at(0).fetch();

    expect(window.fetch.mock.calls[1][0]).toEqual('/library/2-the-tempest');
    expect(window.fetch.mock.calls[1][1].type).toEqual('GET');
    expect(window.fetch.mock.calls[1][1].data).not.toBeDefined();
  });

  test('destroy', async() => {
    library.add(attrs);
    await library.at(0).save({id: '2-the-tempest', author: 'Tim Shakespeare'});
    await library.at(0).destroy({wait: true});

    expect(window.fetch.mock.calls[1][0]).toEqual('/library/2-the-tempest');
    expect(window.fetch.mock.calls[1][1].type).toEqual('DELETE');
    expect(window.fetch.mock.calls[1][1].data).not.toBeDefined();
  });

  test('urlError', async() => {
    var model = new Model();

    expect(() => model.fetch()).toThrow();

    await model.fetch({url: '/one/two'});
    expect(window.fetch.mock.calls[0][0]).toEqual('/one/two');
  });

  test('#1052 - `options` is optional', async() => {
    var model = new Model();

    model.url = '/test';

    await Sync.default('create', model);
  });
});
