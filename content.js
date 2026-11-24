(() => {
  "use strict";
  if (globalThis.__chatgptVocalLoaded) return;
  globalThis.__chatgptVocalLoaded = true;

  // Authenticated DOM inspected 2026-11-24; French microphone/send supplied 2026-11-25.
  // Keep interface-specific selectors here. Unknown layouts fail closed.
  const SELECTORS = Object.freeze({
    layout: '[data-app-shell-main-content-layout], [data-testid="ds-document-layout"], main',
    transcript: "[data-chatgpt-conversation-selection-target][data-rail-chat-transcript]",
    turn: "[data-turn-key]",
    assistant: '[data-conversation-role="assistant"]',
    complete: '[data-talvt-turn-state="complete"]',
    dictate: 'button[data-dictation-button="idle"], button[data-start-dictation]',
    dictationState: "button[data-dictation-button]",
    voice: 'button[data-composer-voice-start="true"]',
    newChat: "button.sidebar-item",
    composer: '[contenteditable="true"][data-composer-markdown]',
    send: 'button[aria-label="Send"], button[aria-label="Envoyer"]',
    generating: 'button[aria-label="Stop"], button[aria-label="Arrêter"], button[aria-label="Arrêter la génération"]',
    read: 'button[aria-label="Read aloud"][aria-pressed="false"], button[aria-label="Lire à voix haute"][aria-pressed="false"]',
    stopReading: 'button[aria-label="Stop reading aloud"][aria-pressed="true"]',
  });
  const INTERACTIVE = 'input, textarea, select, button, a, summary, label, audio, video, iframe, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="slider"], [role="switch"], [role="menuitem"], [role="tab"]';
  const session = new ChatGPTVocalState.Session(location.pathname);
  const button = document.createElement("button");
  button.id = "chatgpt-vocal-button";
  button.type = "button";
  button.hidden = true;
  document.body.append(button);
  let layout = null;
  let frame = 0;
  let drag = null;
  let suppressClick = false;
  let position = null;
  let positionChanged = false;
  let currentControl = null;
  let dictationPress = null;
  let knownReadControl = null;
  const SIZE = 48;
  const MARGIN = 8;
  const STORAGE_KEY = "floatingPosition";

  function visible(element) {
    return Boolean(element?.isConnected && element.getClientRects().length && !element.closest('[hidden], [inert], [aria-hidden="true"]'));
  }

  function enabled(element) {
    return Boolean(element && !element.disabled && element.getAttribute("aria-disabled") !== "true");
  }

  function findVisible(selector, root = layout) {
    if (!root) return null;
    return Array.from(root.querySelectorAll(selector)).find(visible) ?? null;
  }

  function snapshot() {
    const transcript = layout && Array.from(layout.querySelectorAll(SELECTORS.transcript)).find(
      element => element.getAttribute("data-chatgpt-conversation-selection-target") === session.route.id && visible(element),
    );
    const turns = transcript?.querySelectorAll(SELECTORS.turn);
    const turn = turns?.[turns.length - 1];
    const readyControl = turn?.querySelector(SELECTORS.read) ?? null;
    if (readyControl) knownReadControl = readyControl;
    // Follow the already identified native toggle, independently of the
    // translated stop label. Never substitute an arbitrary pressed button.
    const playingControl = knownReadControl && turn?.contains(knownReadControl) &&
      knownReadControl.getAttribute("aria-pressed") === "true" ? knownReadControl : null;
    const control = playingControl ?? turn?.querySelector(SELECTORS.stopReading) ?? readyControl;
    return {
      key: turn?.getAttribute("data-turn-key") ?? null,
      generating: Boolean(findVisible(SELECTORS.generating)),
      complete: Boolean(turn?.querySelector(SELECTORS.assistant) && turn?.querySelector(SELECTORS.complete)),
      readable: enabled(control),
      playing: control?.getAttribute("aria-pressed") === "true",
      control,
    };
  }

  function render(state) {
    const descriptions = {
      inactive: "Lecture vocale inactive",
      waiting: "En attente d’une nouvelle réponse — déplacer pour repositionner",
      generating: "Réponse en cours — lecture indisponible",
      ready: "Lire la dernière réponse (Espace)",
      playing: "Arrêter la lecture",
    };
    button.hidden = state === "inactive";
    if (button.dataset.state === state) return;
    button.dataset.state = state;
    button.textContent = state === "playing" ? "■" : "▶";
    button.setAttribute("aria-label", descriptions[state]);
    button.title = descriptions[state];
    button.setAttribute("aria-disabled", String(state !== "ready" && state !== "playing"));
    // Do not use disabled: pointer dragging must work in waiting/generating states.
  }

  function refresh() {
    frame = 0;
    session.navigate(location.pathname);
    bindLayout();
    if (!session.active) {
      currentControl = null;
      render("inactive");
      return;
    }
    const data = snapshot();
    currentControl = data.control;
    render(session.update(data));
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  const observer = new MutationObserver(records => {
    // Native handlers can leave idle before click reaches the document.
    // Observe the known state transition even while our UI is inactive.
    for (const record of records) {
      if (record.type === "attributes" && record.attributeName === "data-dictation-button" &&
          record.oldValue === "idle" && record.target.matches(SELECTORS.dictationState) &&
          record.target.getAttribute("data-dictation-button") !== "idle") {
        beginDictation(record.target, true);
      }
    }
    if (!session.active) return;
    // Ignore our own UI, text streaming and unrelated style/class changes.
    if (records.some(record => record.target !== button && !button.contains(record.target))) schedule();
  });
  let bootstrapObserver = null;

  function bindLayout() {
    if (visible(layout)) return;
    const next = Array.from(document.querySelectorAll(SELECTORS.layout)).find(visible) ?? null;
    if (next === layout && next?.isConnected) return;
    observer.disconnect();
    layout = next;
    if (!layout) {
      // Discovery only; disconnected as soon as the application layout exists.
      if (!bootstrapObserver) {
        bootstrapObserver = new MutationObserver(schedule);
        bootstrapObserver.observe(document.body, { childList: true, subtree: true });
      }
      return;
    }
    bootstrapObserver?.disconnect();
    bootstrapObserver = null;
    observer.observe(layout, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["aria-label", "aria-pressed", "disabled", "aria-disabled", "data-talvt-turn-state", "data-dictation-button", "data-chatgpt-conversation-selection-target"],
    });
  }

  function syncRoute() {
    session.navigate(location.pathname);
    render(session.state);
    schedule();
  }
  window.navigation?.addEventListener("currententrychange", syncRoute);
  window.addEventListener("popstate", syncRoute);
  window.addEventListener("pageshow", syncRoute);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

  function markSubmit() {
    session.submit(snapshot().key);
    render(session.state);
    schedule();
  }

  function beginDictation(target, nativeTransition = false) {
    const nativeButton = target?.closest(nativeTransition ? SELECTORS.dictationState : SELECTORS.dictate);
    if (!nativeButton || !visible(nativeButton) || nativeButton.matches(SELECTORS.voice) ||
        (!nativeTransition && !enabled(nativeButton))) return false;
    session.navigate(location.pathname);
    bindLayout();
    session.dictate(snapshot().key);
    render(session.state);
    schedule();
    return true;
  }

  // Capture before ChatGPT handles pointerdown and changes the native state.
  // Do not preventDefault: Brave/ChatGPT keep their native microphone behavior.
  document.addEventListener("pointerdown", event => {
    dictationPress = null;
    if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return;
    const nativeButton = event.target.closest(SELECTORS.dictate);
    if (beginDictation(nativeButton)) dictationPress = nativeButton;
  }, true);

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target || button.contains(target)) return;
    syncRoute();
    const link = target.closest("a[href]");
    if (link) {
      const destination = new URL(link.href, location.href);
      if (destination.origin === location.origin && destination.pathname !== location.pathname) {
        session.navigate(destination.pathname, true);
        render(session.state);
      }
      return;
    }
    const newChat = target.closest(SELECTORS.newChat);
    if (["New chat", "Nouvelle conversation"].includes(newChat?.textContent.trim())) {
      session.reset();
      render(session.state);
      schedule();
      return;
    }
    const pressedButton = dictationPress;
    dictationPress = null;
    if (pressedButton?.contains(target)) return;
    // Activation must not depend on a particular ChatGPT layout existing.
    if (beginDictation(target)) return;
    if (!layout?.contains(target)) return;
    if (target.closest(SELECTORS.send) && enabled(target.closest(SELECTORS.send))) {
      markSubmit();
    }
    schedule();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing) return;
    const path = event.composedPath();
    if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey &&
        (event.key === "Enter" || event.code === "Space")) {
      const target = path.find(node => node instanceof Element);
      if (target && beginDictation(target)) return;
    }
    const inComposer = path.some(node => node instanceof Element && node.matches(SELECTORS.composer));
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && inComposer) {
      markSubmit();
      return;
    }
    if (event.code !== "Space" || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (path.some(node => node instanceof Element && node.matches(INTERACTIVE))) return;
    // Re-read the native state before swallowing the browser's Space behavior.
    refresh();
    if (session.state !== "ready" || !enabled(currentControl)) return;
    event.preventDefault();
    event.stopPropagation();
    activate();
  }, true);

  function activate() {
    refresh();
    if ((session.state !== "ready" && session.state !== "playing") || !enabled(currentControl)) return;
    const control = currentControl;
    // Lock immediately while native audio is loading. Mutations settle the state.
    render("waiting");
    control.click();
    schedule();
  }

  function place(x, y) {
    const maxX = Math.max(0, innerWidth - SIZE);
    const maxY = Math.max(0, innerHeight - SIZE);
    position = {
      x: Math.max(Math.min(MARGIN, maxX), Math.min(x, Math.max(0, maxX - MARGIN))),
      y: Math.max(Math.min(MARGIN, maxY), Math.min(y, Math.max(0, maxY - MARGIN))),
    };
    button.style.left = `${position.x}px`;
    button.style.top = `${position.y}px`;
  }

  function savePosition() {
    try { chrome.storage.local.set({ [STORAGE_KEY]: position }).catch(() => {}); } catch { /* Storage unavailable. */ }
  }

  place(16, innerHeight - SIZE - 96);
  try {
    chrome.storage.local.get(STORAGE_KEY).then(saved => {
      const value = saved[STORAGE_KEY];
      if (!positionChanged && value && Number.isFinite(value.x) && Number.isFinite(value.y)) place(value.x, value.y);
    }).catch(() => {});
  } catch { /* Position remains usable without storage. */ }

  button.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, moved: false };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    positionChanged = true;
    suppressClick = true;
    button.dataset.dragging = "true";
    place(drag.x + dx, drag.y + dy);
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) savePosition();
    drag = null;
    delete button.dataset.dragging;
  }
  button.addEventListener("pointerup", endDrag);
  button.addEventListener("pointercancel", endDrag);
  button.addEventListener("lostpointercapture", endDrag);
  button.addEventListener("click", event => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    activate();
  });
  window.addEventListener("resize", () => {
    place(position.x, position.y);
    schedule();
  });
  refresh();
})();
