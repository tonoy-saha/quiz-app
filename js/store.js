// ── Local session / state store ────────────────────────────────────
// Handles "who is logged in" (admin vs student) and small bits of
// client-side cache. Real quiz + result data lives in Google Drive
// (see drive.js) — this is just session/UI state.

const Store = {
  // Both admin and student sessions live in sessionStorage only, so
  // closing the tab/browser always logs everyone out and the app opens
  // fresh at the login screen next time — matches normal expectations
  // (and avoids a shared/lab computer showing a previous student's
  // login on reopen). Within the same open tab, session persists
  // normally across hash navigation.
  get session(){
    try{
      return JSON.parse(sessionStorage.getItem(CONFIG.LS_SESSION) || "null");
    }catch(e){ return null; }
  },
  set session(val){
    if (val === null) sessionStorage.removeItem(CONFIG.LS_SESSION);
    else sessionStorage.setItem(CONFIG.LS_SESSION, JSON.stringify(val));
  },

  loginAdmin(){
    this.session = { role: "admin", name: "Admin" };
  },
  loginStudent(name, rollId){
    this.session = { role: "student", name, rollId };
  },
  logout(){
    this.session = null;
  },

  isAdmin(){ return this.session && this.session.role === "admin"; },
  isStudent(){ return this.session && this.session.role === "student"; },

  // Last completed quiz result, kept in memory only (not persisted) —
  // just used to hand data from the take-quiz view to the results view.
  _lastResult: null,
  get lastResult(){ return this._lastResult; },
  set lastResult(val){ this._lastResult = val; },
};

function toast(message, type){
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = message;
  root.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3800);
}

function escapeHtml(str){
  if (str == null) return "";
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function uid(prefix){
  return (prefix||"id") + "_" + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
