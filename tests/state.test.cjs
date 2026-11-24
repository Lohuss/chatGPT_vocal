const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Session, route } = require('../state.js');
const old = { key: 'old', complete: true, readable: true, generating: false, playing: false };
const fresh = { ...old, key: 'fresh' };

function ready() {
  const session = new Session('/c/one');
  session.dictate('old');
  session.submit('old');
  session.update({ ...fresh, generating: true, complete: false, readable: false });
  assert.equal(session.update(fresh), 'ready');
  return session;
}

test('inactive until dictation; old answers remain blocked until a send', () => {
  const s = new Session('/c/one');
  assert.equal(s.update(old), 'inactive');
  s.dictate('old');
  assert.equal(s.update(old), 'waiting');
  assert.equal(s.update(fresh), 'waiting');
});
test('submission disables old reply, generation blocks reading, completed new reply unlocks', () => {
  const s = new Session('/c/one');
  s.dictate('old');
  s.submit('old');
  assert.equal(s.update(old), 'waiting');
  assert.equal(s.update({ ...old, generating: true }), 'generating');
  assert.equal(s.update(old), 'waiting');
  assert.equal(s.update({ ...fresh, complete: false, readable: false }), 'waiting');
  assert.equal(s.update(fresh), 'ready');
});
test('playing state follows native control, keyboard submissions keep activation', () => {
  const s = ready();
  assert.equal(s.update({ ...fresh, playing: true }), 'playing');
  s.submit('fresh');
  assert.equal(s.active, true);
  assert.equal(s.update(fresh), 'waiting');
  assert.equal(s.update({ ...fresh, key: 'third' }), 'ready');
});
test('virtualization never substitutes another rendered response for the pinned one', () => {
  const s = ready();
  assert.equal(s.update(old), 'waiting');
  assert.equal(s.update({ ...fresh, key: null }), 'waiting');
  assert.equal(s.update(fresh), 'ready');
});
test('new dictation blocks the preceding answer again', () => {
  const s = ready();
  s.dictate('fresh');
  assert.equal(s.update(fresh), 'waiting');
});
test('different chat resets; going back does not restore activation', () => {
  const s = ready();
  s.navigate('/c/two');
  assert.equal(s.active, false);
  s.navigate('/c/one');
  assert.equal(s.update(fresh), 'inactive');
});
test('first send adopts new conversation ID without losing activation', () => {
  const s = new Session('/');
  s.dictate(null);
  s.submit(null);
  s.navigate('/c/new');
  assert.equal(s.active, true);
  assert.equal(s.update(fresh), 'ready');
});
test('a clicked conversation link during first send resets instead of adopting', () => {
  const s = new Session('/');
  s.dictate(null);
  s.submit(null);
  s.navigate('/c/existing', true);
  assert.equal(s.active, false);
});
test('home navigation without submission resets; unrelated paths are unsupported', () => {
  const s = new Session('/');
  s.dictate(null);
  s.navigate('/c/existing');
  assert.equal(s.active, false);
  s.navigate('/settings');
  s.dictate(null);
  assert.equal(s.active, false);
});
test('project conversation ID is used independently of its URL prefix', () => {
  const s = ready();
  s.navigate('/g/g-project/c/one');
  assert.equal(s.active, true);
  assert.equal(route('/g/g-project/c/one').id, 'one');
});
test('missing native control or incomplete answer fails closed', () => {
  const s = ready();
  assert.equal(s.update({ ...fresh, readable: false }), 'waiting');
  assert.equal(s.update({ ...fresh, complete: false }), 'waiting');
});
