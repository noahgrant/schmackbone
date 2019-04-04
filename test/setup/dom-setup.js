var fragment = document.createDocumentFragment(),
    qUnitEl = document.createElement('div'),
    qUnitFixtureEl = document.createElement('div');

qUnitEl.setAttribute('id', 'qunit');
qUnitFixtureEl.setAttribute('id', 'qunit-fixture');

fragment.appendChild(qUnitEl);
fragment.appendChild(qUnitFixtureEl);

document.body.appendChild(fragment);
