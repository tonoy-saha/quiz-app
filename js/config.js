// ── App configuration ──────────────────────────────────────────────
// Edit these if you need to change the Google Client ID or admin password.

const CONFIG = {
  // Google OAuth Client ID, from Google Cloud Console → Credentials
  GOOGLE_CLIENT_ID: "789441256732-qafoite0mpse8t3cuavf5vih27us4t5e.apps.googleusercontent.com",

  // Google API key (NOT the OAuth client ID) — needed so a student's
  // browser, which has no Google login at all, can fetch a public
  // quiz file. Get one free: Google Cloud Console → APIs & Services →
  // Credentials → Create Credentials → API key. No restrictions needed
  // beyond limiting it to the Drive API if you want to be cautious.
  GOOGLE_API_KEY: "PASTE_YOUR_API_KEY_HERE",

  // Drive scope: per-file access only (app can only see files it creates) — safer than full Drive access
  DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",

  // Name of the root folder this app creates in the admin's Drive
  DRIVE_ROOT_FOLDER: "MCQ Quiz App",

  // Fixed admin password (prototype-level auth only — not secure, just a gate)
  ADMIN_PASSWORD: "admin123",

  // ── GitHub one-click publish ────────────────────────────────────
  // Lets "Save" in the admin panel push quiz files straight into this
  // repo's quizzes/ folder, so GitHub Pages serves them live within
  // ~1-2 minutes, with no manual download/move/git-push steps.
  //
  // The token itself is NOT stored here — it's entered once by the
  // admin in the dashboard UI and kept only in this browser's
  // localStorage, so it's never written into a committed file (GitHub's
  // push protection blocks commits containing a recognizable token
  // anyway, and it's better hygiene besides). Only the repo location
  // (not secret) lives in this config file.
  GITHUB_OWNER: "tonoy-saha",
  GITHUB_REPO: "quiz-app",

  // LocalStorage keys
  LS_SESSION: "quizapp_session",
  LS_DRIVE_TOKEN: "quizapp_drive_token",
};
