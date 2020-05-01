(function(QUnit) {

  QUnit.module('Schmackbone.noConflict');

  QUnit.test('noConflict', function(assert) {
    assert.expect(2);
    var noconflictSchmackbone = Schmackbone.noConflict();
    assert.equal(window.Schmackbone, undefined, 'Returned window.Schmackbone');
    window.Schmackbone = noconflictSchmackbone;
    assert.equal(window.Schmackbone, noconflictSchmackbone, 'Schmackbone is still pointing to the original Schmackbone');
  });

})(QUnit);
