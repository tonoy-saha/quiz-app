// ── Self-practice (student self-upload) ──────────────────────────────
// Lets a student upload their own study photos, extract questions
// (OCR + crop, bulk-paste, or manual typing — reusing the exact same
// generic tools built for the admin's create-quiz page, since none of
// those functions are actually admin-specific), quickly review/fix the
// results, and immediately start a personal practice quiz — no saving,
// no publishing, no admin involved. Everything lives only in this
// browser tab for this one session.

function renderSelfPractice(container){
  const state = {
    questions: [],
    images: [],
  };

  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow"><a href="#/student">← ড্যাশবোর্ড</a></div>
        <h1>নিজে প্রশ্ন যুক্ত করুন</h1>
        <p class="text-soft text-sm mt-1">
          নিজের পড়ার বই/নোটের ছবি দিয়ে প্রশ্ন বের করুন, দ্রুত চোখ বুলিয়ে ঠিক করুন, তারপর সাথে সাথে নিজের জন্য একটি অনুশীলন পরীক্ষা শুরু করুন।
          এটি কোথাও সেভ হয় না — শুধু এই ব্রাউজার সেশনে থাকে।
        </p>
      </div>

      <div class="role-toggle" style="max-width:620px;">
        <button data-mode="bulk" class="active">বাল্ক পেস্ট (Claude দিয়ে)</button>
        <button data-mode="image">ছবি থেকে (OCR)</button>
        <button data-mode="manual">টাইপ করে যুক্ত করুন</button>
      </div>

      <div id="add-mode-slot" class="mt-2"></div>

      <hr class="tear-line" />

      <div class="page-head" style="margin-bottom:14px;">
        <div class="flex-between">
          <h2>প্রশ্নতালিকা <span class="text-soft text-sm mono" id="q-count">(০টি)</span></h2>
        </div>
      </div>
      <div id="question-list"></div>

      <div class="flex-gap mt-3">
        <button class="btn" id="start-practice-btn">অনুশীলন পরীক্ষা শুরু করুন</button>
      </div>
    </div>
  `;

  bindTopbarEvents(container);

  const modeToggle = container.querySelectorAll(".role-toggle button");
  const modeSlot = container.querySelector("#add-mode-slot");
  let mode = "bulk";

  modeToggle.forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    modeToggle.forEach(x => x.classList.toggle("active", x.dataset.mode === mode));
    renderMode();
  }));

  function renderMode(){
    if (mode === "bulk") renderBulkMode(modeSlot, state, refreshQuestionList);
    else if (mode === "image") renderImageMode(modeSlot, state, refreshQuestionList);
    else renderManualMode(modeSlot, state, refreshQuestionList);
  }

  function refreshQuestionList(){
    const listEl = container.querySelector("#question-list");
    container.querySelector("#q-count").textContent = `(${state.questions.length}টি)`;

    if (state.questions.length === 0){
      listEl.innerHTML = `<div class="empty-state"><div class="glyph">📄</div><p>এখনো কোনো প্রশ্ন যুক্ত হয়নি।</p></div>`;
      return;
    }

    listEl.innerHTML = state.questions.map((q, i) => `
      <div class="card mb-2" data-qid="${q.id}">
        <div class="flex-between">
          <span class="eyebrow">প্রশ্ন ${i + 1}</span>
          <button class="linklike-btn remove-q" data-id="${q.id}" title="মুছুন">✕</button>
        </div>
        <p class="q-text" style="font-size:1rem; margin: 8px 0 12px;">${escapeHtml(q.question)}</p>
        <div class="mini-options">
          ${["A","B","C","D"].map(k => `
            <div class="mini-option ${q.answer === k ? "is-answer" : ""}">
              <strong>${k}.</strong> ${escapeHtml(q.options[k] || "")}
              ${q.answer === k ? `<span class="ans-tag">✓ সঠিক উত্তর</span>` : ""}
            </div>
          `).join("")}
        </div>
        <button class="btn btn-outline btn-sm mt-2 edit-q" data-id="${q.id}">সম্পাদনা করুন</button>
      </div>
    `).join("");

    listEl.querySelectorAll(".remove-q").forEach(btn => btn.addEventListener("click", () => {
      state.questions = state.questions.filter(q => q.id !== btn.dataset.id);
      refreshQuestionList();
    }));
    listEl.querySelectorAll(".edit-q").forEach(btn => btn.addEventListener("click", () => {
      openEditDialog(state, btn.dataset.id, refreshQuestionList);
    }));
  }

  renderMode();
  refreshQuestionList();

  container.querySelector("#start-practice-btn").addEventListener("click", () => {
    if (state.questions.length === 0){
      toast("অন্তত একটি প্রশ্ন যুক্ত করুন।", "error");
      return;
    }

    const syntheticQuiz = {
      title: "ব্যক্তিগত অনুশীলন",
      questions: state.questions,
      negativeMarkingFraction: 0,
      timeLimitMinutes: 0,
      questionsPerAttempt: state.questions.length,
    };

    startQuizFlow(container, syntheticQuiz, "self-practice");
  });
}
