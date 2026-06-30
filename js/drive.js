// ── Google Drive integration ───────────────────────────────────────
// Uses Google Identity Services (GIS) for OAuth (token model) and the
// Drive v3 REST API directly via fetch — no need for the heavier
// gapi client library for this.
//
// Scope used: drive.file — the app can only see/edit files *it* creates,
// not your whole Drive. Folder + files are created on first admin login.

const Drive = {
  accessToken: null,
  tokenClient: null,
  rootFolderId: null,
  _ready: false,

  // Resolve once GIS script + token client are ready
  init(){
    return new Promise((resolve) => {
      const trySetup = () => {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2){
          setTimeout(trySetup, 150);
          return;
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          scope: CONFIG.DRIVE_SCOPE,
          callback: (resp) => {
            if (resp && resp.access_token){
              this.accessToken = resp.access_token;
              sessionStorage.setItem(CONFIG.LS_DRIVE_TOKEN, resp.access_token);
              this._onAuthResolved && this._onAuthResolved(resp);
            } else {
              this._onAuthRejected && this._onAuthRejected(resp);
            }
          },
        });
        this._ready = true;
        resolve();
      };
      trySetup();
    });
  },

  // Trigger the Google sign-in / consent popup
  connect(){
    return new Promise((resolve, reject) => {
      this._onAuthResolved = (resp) => resolve(resp);
      this._onAuthRejected = (resp) => reject(resp);
      this.tokenClient.requestAccessToken({ prompt: this.accessToken ? "" : "consent" });
    });
  },

  isConnected(){ return !!this.accessToken; },

  // Try to silently restore a token from this browser session
  restoreFromSession(){
    const t = sessionStorage.getItem(CONFIG.LS_DRIVE_TOKEN);
    if (t) this.accessToken = t;
    return !!t;
  },

  disconnect(){
    if (this.accessToken && window.google){
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    sessionStorage.removeItem(CONFIG.LS_DRIVE_TOKEN);
  },

  async _authedFetch(url, options = {}){
    const headers = Object.assign({}, options.headers, {
      Authorization: `Bearer ${this.accessToken}`,
    });
    const res = await fetch(url, Object.assign({}, options, { headers }));
    if (res.status === 401){
      throw new Error("DRIVE_AUTH_EXPIRED");
    }
    return res;
  },

  // Find or create the app's root folder ("MCQ Quiz App")
  async ensureRootFolder(){
    if (this.rootFolderId) return this.rootFolderId;

    const q = encodeURIComponent(
      `name='${CONFIG.DRIVE_ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const searchRes = await this._authedFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0){
      this.rootFolderId = searchData.files[0].id;
      return this.rootFolderId;
    }

    const createRes = await this._authedFetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: CONFIG.DRIVE_ROOT_FOLDER,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });
    const created = await createRes.json();
    this.rootFolderId = created.id;
    return this.rootFolderId;
  },

  // List quiz JSON files in the root folder
  async listQuizFiles(){
    const parent = await this.ensureRootFolder();
    const q = encodeURIComponent(
      `'${parent}' in parents and name contains 'quiz_' and trashed=false`
    );
    const res = await this._authedFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`
    );
    const data = await res.json();
    return data.files || [];
  },

  // Upload a JSON object as a named file inside a given folder
  async writeJsonFile(filename, folderId, obj){
    const boundary = "-------quizapp" + Date.now();
    const metadata = { name: filename, mimeType: "application/json", parents: folderId ? [folderId] : undefined };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(obj)}\r\n` +
      `--${boundary}--`;

    const res = await this._authedFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      }
    );
    return res.json();
  },

  // Overwrite an existing file's content by file ID
  async updateJsonFile(fileId, obj){
    const res = await this._authedFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      }
    );
    return res.json();
  },

  // Read a file's JSON content by file ID
  async readJsonFile(fileId){
    const res = await this._authedFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
    return res.json();
  },

  async deleteFile(fileId){
    await this._authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: "DELETE" });
  },

  // ── High-level helpers used by views ──────────────────────────────

  async saveQuiz(quiz){
    const parent = await this.ensureRootFolder();
    const filename = `quiz_${quiz.id}.json`;
    let fileId;
    if (quiz._driveFileId){
      await this.updateJsonFile(quiz._driveFileId, quiz);
      fileId = quiz._driveFileId;
    } else {
      const created = await this.writeJsonFile(filename, parent, quiz);
      fileId = created.id;
      // Make readable via link, with no Google login, so students can
      // fetch the quiz without being signed in to anything.
      await this.makeReadablePublic(fileId);
    }
    return fileId;
  },

  // Grants "anyone with the link can view" on a file. Needed so a
  // student's browser (no Google session at all) can read quiz data
  // directly from Drive via a public download URL.
  async makeReadablePublic(fileId){
    await this._authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  },

  // Public download URL for a file made readable via makeReadablePublic.
  // Works with no auth, callable from a student's unauthenticated browser.
  publicFileUrl(fileId){
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${CONFIG.GOOGLE_API_KEY}`;
  },

  async loadAllQuizzes(){
    const files = await this.listQuizFiles();
    const quizzes = [];
    for (const f of files){
      try{
        const data = await this.readJsonFile(f.id);
        data._driveFileId = f.id;
        quizzes.push(data);
      }catch(e){ /* skip unreadable file */ }
    }
    return quizzes;
  },

  async deleteQuiz(quiz){
    if (quiz._driveFileId) await this.deleteFile(quiz._driveFileId);
  },
};
