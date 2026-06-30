# MCQ Quiz App

A single-page MCQ exam app. Admin uploads question-bank images, runs in-browser OCR to pull out text, arranges it into questions with 4 options + correct answer, and saves the quiz to Google Drive. Students open a shared link, take the quiz, and download their graded result.

## One-time setup before this works

### 1. Add your Google API key (separate from the Client ID you already have)

Open `js/config.js` and replace `PASTE_YOUR_API_KEY_HERE` with a real API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your existing project
2. **APIs & Services → Credentials → + Create Credentials → API key**
3. Copy the key into `GOOGLE_API_KEY` in `js/config.js`
4. (Recommended) Click "Restrict key" → API restrictions → limit it to **Google Drive API** only

This key lets a student's browser — which has no Google login at all — fetch a quiz file you've shared, without needing the OAuth flow your admin login uses.

### 2. Change the admin password

In `js/config.js`, change `ADMIN_PASSWORD` from `"admin123"` to something only you know. This is a simple gate, not real security — anyone who reads the deployed JS can see it, so don't reuse a real password here.

### 3. Deploy

Push this folder to your GitHub repo (the one behind `https://tonoy-saha.github.io/quiz-app/`) and enable GitHub Pages on it. Because your registered OAuth origin is `https://tonoy-saha.github.io` (origin only, no sub-path), Drive sign-in will work correctly regardless of which sub-path the app sits at.

## How it works

**Admin** (password login):
- Create Quiz → upload question-bank images → click a thumbnail to run OCR → copy/arrange the extracted text into the question + 4 options + correct-answer form → repeat per question → Save. First save also makes the quiz file "anyone with the link can view" so students can fetch it with no login.
- Manage Quizzes → see all saved quizzes, copy each one's shareable student link, delete quizzes, or import result files students send back to you.

**Student** (name + roll/ID only, no Google account needed):
- Opens the link the admin shares (`#/student/take/<fileId>`) or pastes it on their dashboard.
- Answers each question (OMR-style bubbles), submits.
- Sees score + full answer review immediately.
- Downloads a small `.json` result file to send back to the admin (WhatsApp, email, etc.) — there's no automatic write-back to your Drive, since that would require students to also sign in to Google, which we intentionally avoided.

## Known limitations (prototype-level, by design)

- **OCR is assistive, not automatic.** Tesseract.js gets you a rough text dump; you still arrange it into question/options/answer by hand. For Bengali text especially, expect to clean up a few characters.
- **No automatic result collection.** Results come back as files students send you, which you then import in Manage Quizzes for a combined view (stored in your browser's local storage only, not Drive).
- **Quiz files are "anyone with the link" readable.** Not searchable or guessable, but not private — don't put sensitive content in a quiz if that matters.
- **Single admin only**, tied to one Google Drive account, as scoped.
