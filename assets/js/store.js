// store.js — minimal observable state container. No library, ~30 lines.
class Store {
  constructor(initial) { this.state = initial; this.listeners = new Set(); }
  get() { return this.state; }
  set(patch) {
    this.state = typeof patch === 'function' ? patch(this.state) : { ...this.state, ...patch };
    this.listeners.forEach(fn => fn(this.state));
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

export const store = new Store({
  user: null,
  role: null,
  subjects: [],
  activeSubjectId: null,
});
