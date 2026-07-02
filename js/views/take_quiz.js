// ── Take quiz view ───────────────────────────────────────────────────

// Static-file variant: fetches the quiz JSON from this same site's own
// quizzes/ folder (plain GitHub Pages static hosting) — no Drive API,
// no API key, no auth, no expiry. This is the path actually used by
// student links now, since Drive's API refuses anonymous/API-key-only
// downloads even for "anyone with the link" files.
async function renderTakeQuizStatic(container, quizId){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> ${t("quiz_loading")}</div>
    </div>
  `;
  bindTopbarEvents(container);

  let quiz;
  try{
    const res = await fetch(`quizzes/${quizId}.json`, { cache: "no-store" });
    if (!res.ok){
      if (res.status === 404){
        showLoadError(container, t("quiz_404"));
      } else {
        showLoadError(container, t("quiz_load_error", { code: res.status }));
      }
      return;
    }
    quiz = await res.json();
  }catch(err){
    console.error(err);
    showLoadError(container, t("quiz_network_error"));
    return;
  }

  if (!quiz.questions || quiz.questions.length === 0){
    showLoadError(container, t("quiz_no_questions"));
    return;
  }

  startQuizFlow(container, quiz, quizId);
}

// Old Drive-based variant — kept for backward compatibility with any
// links already shared, but Drive's API blocks anonymous alt=media
// downloads even on "anyone with the link" files, so this path will
// reliably 403. New links should always use take-static instead.
async function renderTakeQuiz(container, fileId){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> ${t("quiz_loading")}</div>
    </div>
  `;
  bindTopbarEvents(container);

  if (!CONFIG.GOOGLE_API_KEY || CONFIG.GOOGLE_API_KEY === "PASTE_YOUR_API_KEY_HERE"){
    showLoadError(container, t("quiz_not_configured"));
    return;
  }

  let quiz;
  try{
    const res = await fetch(Drive.publicFileUrl(fileId));
    if (!res.ok){
      if (res.status === 403){
        showLoadError(container, t("quiz_old_link"));
      } else if (res.status === 404){
        showLoadError(container, t("quiz_404"));
      } else {
        showLoadError(container, t("quiz_load_error", { code: res.status }));
      }
      return;
    }
    quiz = await res.json();
  }catch(err){
    console.error(err);
    showLoadError(container, t("quiz_network_error"));
    return;
  }

  if (!quiz.questions || quiz.questions.length === 0){
    showLoadError(container, t("quiz_no_questions"));
    return;
  }

  startQuizFlow(container, quiz, fileId);
}

function showLoadError(container, msg){
  const page = container.querySelector(".page");
  page.innerHTML = `<div class="card"><p>${escapeHtml(msg)}</p><a href="#/student" class="btn btn-outline btn-sm mt-2" style="text-decoration:none; display:inline-flex;">${t("quiz_go_back")}</a></div>`;
}

function startQuizFlow(container, quiz, fileId){
  const session = Store.session;

  // If the quiz has more questions than questionsPerAttempt, draw a
  // random subset each attempt instead of always showing everything —
  // makes repeat practice feel fresh from a larger question pool.
  const pool = shuffle([...quiz.questions]);
  const poolSize = quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0
    ? Math.min(quiz.questionsPerAttempt, pool.length)
    : pool.length;
  const questions = pool.slice(0, poolSize);

  const answers = {}; // questionId -> "A"|"B"|"C"|"D"
  let index = 0;

  const page = container.querySelector(".page");

  // ── Timer ──────────────────────────────────────────────────────
  let timerInterval = null;
  let secondsLeft = quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0
    ? quiz.timeLimitMinutes * 60
    : null;

  function startTimer(){
    if (secondsLeft === null) return;
    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerDisplay();
      if (secondsLeft <= 0){
        clearInterval(timerInterval);
        submitQuiz();
      }
    }, 1000);
  }

  function updateTimerDisplay(){
    const el = page.querySelector("#quiz-timer");
    if (!el || secondsLeft === null) return;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    el.textContent = `${m}:${String(s).padStart(2, "0")}`;
    el.classList.toggle("timer-warn", secondsLeft <= 60);
  }

  function renderQuestion(){
    const q = questions[index];

    page.innerHTML = `
      <div class="page-head">
        <div class="flex-between">
          <div class="eyebrow">${escapeHtml(quiz.title)}</div>
          ${secondsLeft !== null ? `<div class="mono" id="quiz-timer" style="font-size:1.1rem;">--:--</div>` : ""}
        </div>
        <div class="progress-rail mt-1">
          ${questions.map((qq, i) => `
            <div class="progress-dot ${i === index ? "current" : ""} ${answers[qq.id] ? "answered" : ""}">${i + 1}</div>
          `).join("")}
        </div>
      </div>

      <div class="question-sheet">
        <div class="q-meta">
          <span class="q-counter">${t("quiz_question_counter", { current: index + 1, total: questions.length })}</span>
        </div>
        <p class="q-text">${escapeHtml(q.question)}</p>
        <div class="omr-options">
          ${["A","B","C","D"].map(k => `
            <button class="omr-option ${answers[q.id] === k ? "selected" : ""}" data-key="${k}">
              <span class="omr-bubble">${k}</span>
              <span class="option-text">${escapeHtml(q.options[k] || "")}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="flex-between mt-3">
        <button class="btn btn-outline" id="prev-btn" ${index === 0 ? "disabled" : ""}>${t("quiz_prev")}</button>
        ${index === questions.length - 1
          ? `<button class="btn" id="submit-btn">${t("quiz_submit")}</button>`
          : `<button class="btn" id="next-btn">${t("quiz_next")}</button>`}
      </div>
    `;

    updateTimerDisplay();

    page.querySelectorAll(".omr-option").forEach(btn => btn.addEventListener("click", () => {
      answers[q.id] = btn.dataset.key;
      page.querySelectorAll(".omr-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    }));

    const prevBtn = page.querySelector("#prev-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => { index--; renderQuestion(); });

    const nextBtn = page.querySelector("#next-btn");
    if (nextBtn) nextBtn.addEventListener("click", () => { index++; renderQuestion(); });

    const submitBtn = page.querySelector("#submit-btn");
    if (submitBtn) submitBtn.addEventListener("click", () => {
      const unanswered = questions.filter(qq => !answers[qq.id]).length;
      if (unanswered > 0){
        if (!confirm(t("quiz_unanswered_confirm", { count: unanswered }))) return;
      }
      submitQuiz();
    });
  }

  function submitQuiz(){
    if (timerInterval) clearInterval(timerInterval);
    const result = gradeQuiz(questions, answers, quiz.negativeMarkingFraction);
    const fullResult = {
      quizId: fileId,
      quizTitle: quiz.title,
      name: session?.name || "",
      rollId: session?.rollId || "",
      submittedAt: new Date().toISOString(),
      ...result,
    };
    Store.lastResult = fullResult;
    location.hash = `#/student/results`;
  }

  renderQuestion();
  startTimer();
}
