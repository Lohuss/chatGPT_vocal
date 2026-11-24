/* Local fixture only. No real ChatGPT data or microphone. */
const french = new URLSearchParams(location.search).get('lang') === 'fr';
history.replaceState({}, '', '/c/one');
window.fixture = {
  reads: 0, stops: 0, writes: 0, stored: {}, counter: 0,
  transcript: document.querySelector('[data-rail-chat-transcript]'),
  layout: document.querySelector('[data-app-shell-main-content-layout]'),
};
fixture.labels = french
  ? { send: 'Envoyer', stop: 'Arrêter', read: 'Lire à voix haute', stopReading: 'Interrompre l’audio' }
  : { send: 'Send', stop: 'Stop', read: 'Read aloud', stopReading: 'Stop reading aloud' };
fixture.send = document.querySelector('button[aria-label="Send"]');
fixture.send.setAttribute('aria-label', fixture.labels.send);
fixture.send.textContent = fixture.labels.send;
if (french) {
  document.querySelector('[data-dictation-button]').setAttribute('aria-label', 'Dicter');
  document.querySelector('[data-dictation-button]').textContent = 'Dicter';
  document.querySelector('#new-chat').textContent = 'Nouvelle conversation';
  const main = document.createElement('main');
  fixture.layout.before(main);
  main.append(fixture.layout);
  fixture.layout.removeAttribute('data-app-shell-main-content-layout');
}
window.chrome = { storage: { local: {
  get: async () => fixture.stored,
  set: async value => { fixture.writes++; Object.assign(fixture.stored, value); },
} } };
fixture.addTurn = function (key, completed = true) {
  const turn = document.createElement('div');
  turn.setAttribute('data-turn-key', key);
  const state = document.createElement('div');
  state.setAttribute('data-talvt-turn-state', 'complete');
  const user = document.createElement('h4');
  user.setAttribute('data-conversation-role', 'user');
  user.textContent = `Question ${key}`;
  state.append(user);
  turn.append(state);
  fixture.transcript.append(turn);
  if (completed) fixture.complete(turn);
  return turn;
};
fixture.complete = function (turn) {
  const assistant = document.createElement('h4');
  assistant.setAttribute('data-conversation-role', 'assistant');
  assistant.textContent = 'Réponse simulée';
  const read = document.createElement('button');
  read.setAttribute('aria-label', fixture.labels.read);
  read.setAttribute('aria-pressed', 'false');
  read.textContent = 'Lecture native simulée';
  read.addEventListener('click', () => {
    const playing = read.getAttribute('aria-pressed') === 'true';
    if (playing) fixture.stops++; else fixture.reads++;
    read.setAttribute('aria-pressed', String(!playing));
    read.setAttribute('aria-label', playing ? fixture.labels.read : fixture.labels.stopReading);
  });
  turn.append(assistant, read);
  fixture.stop?.remove();
};
fixture.addTurn('old');
fixture.send.addEventListener('click', () => {
  fixture.latest = fixture.addTurn(`new-${++fixture.counter}`, false);
  const stop = document.createElement('button');
  stop.setAttribute('aria-label', fixture.labels.stop);
  fixture.stop = stop;
  stop.textContent = 'Stop generation';
  fixture.layout.append(stop);
});
