/* Local fixture only. No real ChatGPT data or microphone. */
history.replaceState({}, '', '/c/one');
window.fixture = {
  reads: 0, stops: 0, writes: 0, stored: {}, counter: 0,
  transcript: document.querySelector('[data-rail-chat-transcript]'),
  layout: document.querySelector('[data-app-shell-main-content-layout]'),
};
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
  read.setAttribute('aria-label', 'Read aloud');
  read.setAttribute('aria-pressed', 'false');
  read.textContent = 'Lecture native simulée';
  read.addEventListener('click', () => {
    const playing = read.getAttribute('aria-pressed') === 'true';
    if (playing) fixture.stops++; else fixture.reads++;
    read.setAttribute('aria-pressed', String(!playing));
    read.setAttribute('aria-label', playing ? 'Read aloud' : 'Stop reading aloud');
  });
  turn.append(assistant, read);
  fixture.layout.querySelector('button[aria-label="Stop"]')?.remove();
};
fixture.addTurn('old');
document.querySelector('button[aria-label="Send"]').addEventListener('click', () => {
  fixture.latest = fixture.addTurn(`new-${++fixture.counter}`, false);
  const stop = document.createElement('button');
  stop.setAttribute('aria-label', 'Stop');
  stop.textContent = 'Stop generation';
  fixture.layout.append(stop);
});
