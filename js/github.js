// ── GitHub publish ──────────────────────────────────────────────────
// Pushes quiz JSON files directly into this repo's quizzes/ folder via
// GitHub's Contents API, so "Save" in the admin panel makes a quiz
// live immediately (GitHub Pages redeploys automatically within ~1-2
// min) — no manual download/move/git-push steps.
//
// SECURITY: the token is entered once by the admin in the dashboard UI
// and stored ONLY in this browser's localStorage — never written into
// any file, never committed to git. This matters because GitHub's push
// protection actively blocks commits containing a recognizable token
// pattern, and even if it didn't, a token baked into a public repo's
// source is permanently visible in git history to anyone. Keeping it
// in localStorage means it only exists in the browser of whoever
// explicitly typed it in — not in the shipped public code.
//
// This does mean re-entering the token on a new device/browser, and
// it's still visible to anyone with access to that browser's DevTools
// — a real tradeoff for a personal/classroom project. Do this properly
// (a server-side proxy) before any higher-stakes deployment.

const GitHubPublish = {
  _tokenKey: "quizapp_github_token",

  getToken(){
    return localStorage.getItem(this._tokenKey) || "";
  },
  setToken(token){
    localStorage.setItem(this._tokenKey, token.trim());
  },
  clearToken(){
    localStorage.removeItem(this._tokenKey);
  },
  isConfigured(){
    return !!this.getToken();
  },

  apiBase(){
    return `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents`;
  },

  headers(){
    return {
      Authorization: `Bearer ${this.getToken()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
  },

  // Cheap call to confirm the stored token actually works and can see
  // this repo, used by the dashboard's "connect" flow.
  async verifyToken(){
    const res = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error("GITHUB_TOKEN_INVALID:" + res.status);
    return res.json();
  },

  // Returns the file's current sha (needed to update it) or null if it
  // doesn't exist yet.
  async getFileSha(path){
    const res = await fetch(`${this.apiBase()}/${path}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok){
      const body = await res.text().catch(() => "");
      console.error("getFileSha failed:", res.status, body);
      throw new Error("GITHUB_FETCH_FAILED:" + res.status);
    }
    const data = await res.json();
    return data.sha;
  },

  // Creates or updates a JSON file at `path` with `contentObj`, in one
  // commit. Handles Bengali/Unicode text correctly (plain btoa() breaks
  // on non-Latin1 characters, so we go through TextEncoder first).
  async publishJson(path, contentObj, message){
    if (!this.isConfigured()) throw new Error("GITHUB_TOKEN_MISSING");

    const sha = await this.getFileSha(path);
    const jsonStr = JSON.stringify(contentObj, null, 2);
    const body = {
      message: message || `Publish ${path}`,
      content: utf8ToBase64(jsonStr),
    };
    if (sha) body.sha = sha;

    const res = await fetch(`${this.apiBase()}/${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok){
      const errBody = await res.text().catch(() => "");
      console.error("GitHub publish failed:", res.status, errBody);
      if (res.status === 401) throw new Error("GITHUB_TOKEN_INVALID");
      throw new Error("GITHUB_PUBLISH_FAILED:" + res.status);
    }
    return res.json();
  },

  async deleteFile(path, message){
    if (!this.isConfigured()) throw new Error("GITHUB_TOKEN_MISSING");
    const sha = await this.getFileSha(path);
    if (!sha) return; // already gone, nothing to do

    const res = await fetch(`${this.apiBase()}/${path}`, {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({ message: message || `Delete ${path}`, sha }),
    });
    if (!res.ok){
      const errBody = await res.text().catch(() => "");
      console.error("GitHub delete failed:", res.status, errBody);
      throw new Error("GITHUB_DELETE_FAILED:" + res.status);
    }
  },
};

function utf8ToBase64(str){
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}
