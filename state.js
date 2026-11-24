/* Pure state machine; no conversation text is read or retained. */
(() => {
  "use strict";

  function route(pathname) {
    const match = pathname.match(/\/c\/([^/]+)(?:\/|$)/);
    return {
      id: match?.[1] ?? null,
      path: pathname,
      supported: Boolean(match) || pathname === "/" || /^\/g\/[^/]+\/?$/.test(pathname),
    };
  }

  class Session {
    constructor(pathname) {
      this.route = route(pathname);
      this.reset();
    }

    reset() {
      this.active = false;
      this.pending = false;
      this.submitted = false;
      this.baseline = null;
      this.target = null;
      this.state = "inactive";
    }

    navigate(pathname, explicit = false) {
      const next = route(pathname);
      if (next.id === this.route.id && next.path === this.route.path && !explicit) return;
      // Home acquires an ID on the first send. A clicked conversation link
      // must never be mistaken for this transition.
      const adopt = !explicit && !this.route.id && next.id && this.submitted;
      const sameChat = next.id && next.id === this.route.id;
      if (!adopt && !sameChat) this.reset();
      this.route = next;
      if (!next.supported) this.reset();
    }

    dictate(latestKey) {
      if (!this.route.supported) return;
      this.active = true;
      this.pending = true;
      this.submitted = false;
      this.baseline = latestKey;
      this.target = null;
      this.state = "waiting";
    }

    submit(latestKey) {
      if (!this.active) return;
      this.pending = true;
      this.submitted = true;
      this.baseline = latestKey;
      this.target = null;
      this.state = "waiting";
    }

    update({ key, generating, complete, readable, playing }) {
      if (!this.active || !this.route.supported) return (this.state = "inactive");
      if (generating) {
        if (this.pending && this.submitted && key && key !== this.baseline && !this.target) {
          this.target = key;
        }
        return (this.state = "generating");
      }
      if (this.pending) {
        if (!this.submitted || !key || key === this.baseline) return (this.state = "waiting");
        // Pin this response, so virtualization cannot substitute an older one.
        if (!this.target) this.target = key;
        if (key !== this.target || !complete || !readable) return (this.state = "waiting");
        this.pending = false;
        this.submitted = false;
      }
      if (!key || key !== this.target || !complete || !readable) return (this.state = "waiting");
      return (this.state = playing ? "playing" : "ready");
    }
  }

  const api = { Session, route };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.ChatGPTVocalState = api;
})();
