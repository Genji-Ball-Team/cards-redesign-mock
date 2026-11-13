// Preferences kept across visits (localStorage, ignored when storage is blocked).
const KEY = "gb-cards";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

const state = { muted: false, ...load() };

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: fine, it just won't stick */
  }
}

export const settings = {
  get muted() {
    return state.muted;
  },
  set muted(v) {
    state.muted = !!v;
    save();
  },
};
