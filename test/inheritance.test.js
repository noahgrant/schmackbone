// Quick Backbone/CoffeeScript tests to make sure that inheritance
// works correctly.
import Model from '../lib/model';

describe('Inheritance', () => {
  class Document extends Model {
    fullName() {
      return `${this.get('name')} ${this.get('surname')}`;
    }
  }

  class ProperDocument extends Document {
    fullName() {
      return `Mr. ${super.fullName()}`;
    }
  }

  it('behaves as expected', () => {
    var tempest = new Document({
          id: '1-the-tempest',
          title: 'The Tempest',
          name: 'William',
          surname: 'Shakespeare',
          length: 123
        }),
        properTempest = new ProperDocument(tempest.toJSON());

    expect(tempest.fullName()).toEqual('William Shakespeare');
    expect(tempest.get('length')).toEqual(123);

    expect(properTempest.fullName()).toEqual('Mr. William Shakespeare');
    expect(properTempest.get('length')).toEqual(123);
  });
});
