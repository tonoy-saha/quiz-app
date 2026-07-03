// ── Gemini AI transcription ──────────────────────────────────────────
// Uses Google's Gemini API (via Google AI Studio) to read a whole
// question-bank image directly and output text in our bulk-paste
// format, which then gets parsed automatically — no cropping needed,
// since Gemini's vision handles dense multi-column pages far better
// than in-browser OCR (Tesseract).
//
// This is a genuinely free, permanent, no-credit-card tier — separate
// from Google Cloud Vision / Firebase, which do require billing. Get a
// key at https://aistudio.google.com (sign in → "Create API key").
//
// Honest tradeoff: free-tier Gemini usage may be reviewed/used by
// Google to improve their products (unlike a paid tier). Fine for
// question-bank photos; worth knowing regardless.
//
// Two ways a key can be supplied:
//   1. CONFIG.GEMINI_API_KEY in config.js — a shared key the admin
//      provides so every student gets one-click extraction with zero
//      setup. This key IS visible in the app's public source (same
//      tradeoff as the Google Drive API key), which is why it should
//      be restricted to this site's domain in Google Cloud Console
//      (Credentials → the key → Application restrictions → HTTP
//      referrers → add your github.io URL). All students share this
//      key's daily quota (1,500 requests/day total).
//   2. A personal key a student pastes in themselves, stored only in
//      their own browser's localStorage — takes priority over the
//      shared key if set, so a student can opt to use their own quota
//      instead of the shared pool.

const GeminiOCR = {
  _keyStorageKey: "quizapp_gemini_key",

  getKey(){
    const personal = localStorage.getItem(this._keyStorageKey);
    if (personal) return personal;
    if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_API_KEY_HERE"){
      return CONFIG.GEMINI_API_KEY;
    }
    return "";
  },
  usingSharedKey(){
    return !localStorage.getItem(this._keyStorageKey)
      && !!CONFIG.GEMINI_API_KEY
      && CONFIG.GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_API_KEY_HERE";
  },
  setKey(k){ localStorage.setItem(this._keyStorageKey, k.trim()); },
  clearKey(){ localStorage.removeItem(this._keyStorageKey); },
  isConfigured(){ return !!this.getKey(); },

  PROMPT: `You are transcribing a Bengali and/or English MCQ (multiple choice question) exam page image into plain text. Output ONLY the questions in this exact format, nothing else — no commentary, no markdown code fences:

Q: <question text>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: <A, B, C, or D>

Separate each question with a blank line. Transcribe every question visible in the image, preserving the original language exactly (do not translate). Determine the correct answer from any visible answer key, checkmark, highlight, or marker like "Ans:"/"উ:" in the image. If truly unclear, make your best guess rather than skipping the question.`,

  fileToBase64(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async transcribeImage(file){
    if (!this.isConfigured()) throw new Error("GEMINI_KEY_MISSING");

    const base64 = await this.fileToBase64(file);
    const mimeType = file.type || "image/jpeg";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.getKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: this.PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
        }),
      }
    );

    if (!res.ok){
      const body = await res.text().catch(() => "");
      console.error("Gemini transcribe failed:", res.status, body);
      if (res.status === 400 || res.status === 403) throw new Error("GEMINI_KEY_INVALID");
      throw new Error("GEMINI_REQUEST_FAILED:" + res.status);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");
    return text;
  },
};
