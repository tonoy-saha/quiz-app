// ── i18n (Bangla / English) ──────────────────────────────────────────
// Covers the topbar and the full student-facing flow (login, student
// dashboard, take-quiz, results). Admin-only screens (create/manage
// quiz) are Bengali-only for now — a lot of ground to cover there,
// can be extended later.

const I18N = {
  _key: "quizapp_lang",

  get(){
    return localStorage.getItem(this._key) || "bn";
  },
  set(lang){
    localStorage.setItem(this._key, lang);
  },
  toggle(){
    this.set(this.get() === "bn" ? "en" : "bn");
  },

  t(key, vars){
    const entry = TRANSLATIONS[key];
    let str = entry ? (entry[this.get()] || entry.bn) : key;
    if (vars){
      Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
    }
    return str;
  },
};

// Shorthand used throughout view files.
function t(key, vars){ return I18N.t(key, vars); }

const TRANSLATIONS = {
  // Topbar
  app_name:            { bn: "MCQ Quiz App",              en: "MCQ Quiz App" },
  logout:              { bn: "লগআউট",                     en: "Log out" },
  role_admin:          { bn: "অ্যাডমিন",                   en: "Admin" },
  role_student:        { bn: "শিক্ষার্থী",                  en: "Student" },
  theme_toggle:        { bn: "থিম",                        en: "Theme" },
  lang_toggle:         { bn: "English",                    en: "বাংলা" },

  // Login
  login_eyebrow:       { bn: "প্রশ্নপত্র ০১",                en: "Question Paper 01" },
  login_title:         { bn: "MCQ পরীক্ষা প্রোগ্রাম",        en: "MCQ Exam Program" },
  login_subtitle:      { bn: "ছবি থেকে প্রশ্ন তৈরি করুন, শিক্ষার্থীদের পরীক্ষা নিন", en: "Create questions from images, test your students" },
  login_role_student:  { bn: "শিক্ষার্থী · Student",         en: "Student · শিক্ষার্থী" },
  login_role_admin:    { bn: "অ্যাডমিন · Admin",            en: "Admin · অ্যাডমিন" },
  login_name_label:    { bn: "আপনার নাম · Name",            en: "Your Name · নাম" },
  login_name_ph:       { bn: "যেমন: তন্ময় সাহা",             en: "e.g. Tonoy Saha" },
  login_roll_label:    { bn: "রোল / আইডি · Roll or ID",     en: "Roll / ID · রোল" },
  login_roll_ph:       { bn: "যেমন: 2014015",               en: "e.g. 2014015" },
  login_enter_exam:    { bn: "পরীক্ষায় প্রবেশ করুন",         en: "Enter Exam" },
  login_admin_pass:    { bn: "অ্যাডমিন পাসওয়ার্ড · Admin password", en: "Admin Password" },
  login_btn:           { bn: "লগইন করুন",                   en: "Log in" },
  login_pass_help:     { bn: "এই পাসওয়ার্ড কোডে নির্ধারিত — config.js ফাইলে পরিবর্তন করা যায়।", en: "This password is set in code — change it in config.js." },
  login_wrong_pass:    { bn: "পাসওয়ার্ড সঠিক নয়।",           en: "Incorrect password." },

  // Student dashboard
  student_eyebrow:     { bn: "শিক্ষার্থী",                   en: "Student" },
  student_welcome:     { bn: "স্বাগতম, {name}",              en: "Welcome, {name}" },
  student_roll_badge:  { bn: "রোল/আইডি: {roll}",            en: "Roll/ID: {roll}" },
  student_instructions:{ bn: "পরীক্ষা শুরু করতে আপনার শিক্ষক/অ্যাডমিনের পাঠানো কুইজ লিংকে ক্লিক করুন।", en: "To start the exam, click the quiz link your teacher/admin sent you." },
  student_paste_hint:  { bn: "লিংক না থাকলে নিচে কুইজ আইডি/লিংক পেস্ট করুন:", en: "If you don't have the link, paste the quiz ID/link below:" },
  student_link_label:  { bn: "কুইজ লিংক বা আইডি",            en: "Quiz link or ID" },
  student_go_btn:      { bn: "পরীক্ষায় যান",                 en: "Go to exam" },
  student_need_link:   { bn: "লিংক বা আইডি দিন।",            en: "Please enter a link or ID." },

  // Take quiz
  quiz_loading:        { bn: "কুইজ লোড হচ্ছে...",             en: "Loading quiz..." },
  quiz_404:            { bn: "কুইজ ফাইল পাওয়া যায়নি (404)। অ্যাডমিন এখনো quizzes ফোল্ডারে ফাইলটি পুশ করেননি, অথবা লিংকটি ভুল।", en: "Quiz file not found (404). The admin hasn't published it yet, or the link is wrong." },
  quiz_load_error:     { bn: "কুইজ লোড করতে সমস্যা হয়েছে (কোড {code})। অ্যাডমিনকে জানান।", en: "Failed to load quiz (code {code}). Let the admin know." },
  quiz_network_error:  { bn: "নেটওয়ার্ক সমস্যা — ইন্টারনেট সংযোগ যাচাই করুন।", en: "Network problem — check your internet connection." },
  quiz_no_questions:   { bn: "এই কুইজে কোনো প্রশ্ন নেই।",     en: "This quiz has no questions." },
  quiz_go_back:        { bn: "ফিরে যান",                     en: "Go back" },
  quiz_old_link:       { bn: "এই পুরনো ধরনের লিংক আর কাজ করে না (Google Drive সীমাবদ্ধতা)। অ্যাডমিনের কাছ থেকে নতুন লিংক নিন।", en: "This old-style link no longer works (Google Drive limitation). Ask the admin for a new link." },
  quiz_not_configured: { bn: "অ্যাপ এখনো সম্পূর্ণ কনফিগার করা হয়নি (API key বাকি আছে)। অ্যাডমিনকে জানান।", en: "The app isn't fully configured yet (missing API key). Let the admin know." },
  quiz_question_counter:{ bn: "প্রশ্ন {current} / {total}",   en: "Question {current} / {total}" },
  quiz_prev:           { bn: "← আগের প্রশ্ন",                 en: "← Previous" },
  quiz_next:           { bn: "পরের প্রশ্ন →",                 en: "Next →" },
  quiz_submit:         { bn: "পরীক্ষা জমা দিন",               en: "Submit Exam" },
  quiz_unanswered_confirm: { bn: "{count}টি প্রশ্নের উত্তর দেওয়া হয়নি। তবুও জমা দিতে চান?", en: "{count} question(s) unanswered. Submit anyway?" },

  // Results
  results_none:        { bn: "কোনো রেজাল্ট পাওয়া যায়নি।",     en: "No result found." },
  results_back_dash:   { bn: "ড্যাশবোর্ডে ফিরে যান",           en: "Back to dashboard" },
  results_correct_of:  { bn: "{correct} / {total} সঠিক",     en: "{correct} / {total} correct" },
  results_roll_line:   { bn: "{name} · রোল: {roll}",         en: "{name} · Roll: {roll}" },
  results_download_btn:{ bn: "রেজাল্ট ডাউনলোড করুন",          en: "Download result" },
  results_review_title:{ bn: "উত্তরপত্র পর্যালোচনা",           en: "Answer sheet review" },
  results_question:    { bn: "প্রশ্ন {n}",                    en: "Question {n}" },
  results_correct_tag: { bn: "✓ সঠিক",                       en: "✓ Correct" },
  results_wrong_tag:   { bn: "✕ ভুল",                        en: "✕ Wrong" },
  results_correct_ans: { bn: "✓ সঠিক উত্তর",                  en: "✓ Correct answer" },
  results_your_ans:    { bn: "আপনার উত্তর",                   en: "Your answer" },
  results_downloaded:  { bn: "রেজাল্ট ফাইল ডাউনলোড হয়েছে। এটি আপনার শিক্ষক/অ্যাডমিনকে পাঠান।", en: "Result file downloaded. Send it to your teacher/admin." },
};
