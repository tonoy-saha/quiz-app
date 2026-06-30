// ── Take quiz view ───────────────────────────────────────────────────

async function renderTakeQuiz(container, fileId){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> কুইজ লোড হচ্ছে...</div>
    </div>
  `;
  bindTopbarEvents(container);

  if (!CONFIG.GOOGLE_API_KEY || CONFIG.GOOGLE_API_KEY === "PASTE_YOUR_API_KEY_HERE"){
    showLoadError(container, "অ্যাপ এখনো সম্পূর্ণ কনফিগার করা হয়নি (API key বাকি আছে)। অ্যাডমিনকে জানান।");
    return;
  }

  let quiz;
  try{
    const res = await fetch(Drive.publicFileUrl(fileId));
    if (!res.ok) throw new Error("fetch failed: " + res.status);
    quiz = await res.json();
  }catch(err){
    console.error(err);
    showLoadError(container, "কুইজ পাওয়া যায়নি। লিংকটি সঠিক কিনা যাচাই করুন, অথবা অ্যাডমিনকে জানান।");
    return;
  }

  if (!quiz.questions || quiz.questions.length === 0){
    showLoadError(container, "এই কুইজে কোনো প্রশ্ন নেই।");
    return;
  }

  startQuizFlow(container, quiz, fileId);
}

function showLoadError(container, msg){
  const page = container.querySelector(".page");
  page.innerHTML = `<div class="card"><p>${escapeHtml(msg)}</p><a href="#/student" class="btn btn-outline btn-sm mt-2" style="text-decoration:none; display:inline-flex;">ফিরে যান</a></div>`;
}

function startQuizFlow(container, quiz, fileId){
  const session = Store.session;
  const questions = shuffle([...quiz.questions]);
  const answers = {}; // questionId -> "A"|"B"|"C"|"D"
  let index = 0;

  const page = container.querySelector(".page");

  function renderQuestion(){
    const q = questions[index];

    page.innerHTML = `
      <div class="page-head">
        <div class="eyebrow">${escapeHtml(quiz.title)}</div>
        <div class="progress-rail mt-1">
          ${questions.map((qq, i) => `
            <div class="progress-dot ${i === index ? "current" : ""} ${answers[qq.id] ? "answered" : ""}">${i + 1}</div>
          `).join("")}
        </div>
      </div>

      <div class="question-sheet">
        <div class="q-meta">
          <span class="q-counter">প্রশ্ন ${index + 1} / ${questions.length}</span>
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
        <button class="btn btn-outline" id="prev-btn" ${index === 0 ? "disabled" : ""}>← আগের প্রশ্ন</button>
        ${index === questions.length - 1
          ? `<button class="btn" id="submit-btn">পরীক্ষা জমা দিন</button>`
          : `<button class="btn" id="next-btn">পরের প্রশ্ন →</button>`}
      </div>
    `;

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
        if (!confirm(`${unanswered}টি প্রশ্নের উত্তর দেওয়া হয়নি। তবুও জমা দিতে চান?`)) return;
      }
      submitQuiz();
    });
  }

  function submitQuiz(){
    const result = gradeQuiz(questions, answers);
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
}
