// ── Theme (light/dark) ──────────────────────────────────────────────

const Theme = {
  _key: "quizapp_theme",

  get(){
    return localStorage.getItem(this._key) || "light";
  },

  set(theme){
    localStorage.setItem(this._key, theme);
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  },

  toggle(){
    this.set(this.get() === "dark" ? "light" : "dark");
  },

  // Called once at boot, before first render, so there's no flash of
  // the wrong theme.
  applyStored(){
    const theme = this.get();
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  },
};
