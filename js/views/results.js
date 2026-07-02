// ── Results view ─────────────────────────────────────────────────────

function renderResults(container){
  const result = Store.lastResult;

  if (!result){
    container.innerHTML = `
      ${renderTopbar()}
      <div class="page">
        <div class="card"><p>${t("results_none")}</p>
        <a href="#/student" class="btn btn-outline btn-sm mt-2" style="text-decoration:none; display:inline-flex;">${t("results_back_dash")}</a></div>
      </div>
    `;
    bindTopbarEvents(container);
    return;
  }

  const hasNegativeMarking = result.negativeMarkingFraction && result.negativeMarkingFraction > 0;

  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head" style="text-align:center;">
        <p class="eyebrow">"${escapeHtml(result.quizTitle)}"</p>
        <div class="flex" style="display:flex; justify-content:center; margin: 18px 0;">
          <div class="score-stamp ${result.percent < 40 ? "fail" : ""}">
            <span class="big">${result.percent}%</span>
            <span class="small">SCORE</span>
          </div>
        </div>
        <p class="mono">${t("results_correct_of", { correct: result.correct, total: result.total })}</p>
        ${hasNegativeMarking ? `<p class="text-soft text-sm mono mt-1">${result.marks} ${I18N.get() === "bn" ? "নম্বর (নেগেটিভ মার্কিং প্রয়োগসহ)" : "marks (after negative marking)"}</p>` : ""}
        <p class="roll-badge mt-1">${t("results_roll_line", { name: escapeHtml(result.name), roll: escapeHtml(result.rollId) })}</p>
      </div>

      <div class="flex-gap mt-3 mb-3" style="justify-content:center;">
        <button class="btn" id="download-result-btn">${t("results_download_btn")}</button>
        <a href="#/student" class="btn btn-outline" style="text-decoration:none; display:inline-flex;">${t("results_back_dash")}</a>
      </div>

      <hr class="tear-line" />

      <h2 class="mb-2 mt-2">${t("results_review_title")}</h2>
      <div id="review-list"></div>
    </div>
  `;

  bindTopbarEvents(container);

  const reviewList = container.querySelector("#review-list");
  reviewList.innerHTML = result.breakdown.map((b, i) => `
    <div class="review-item ${b.isCorrect ? "is-correct" : "is-wrong"}">
      <div class="flex-between">
        <span class="eyebrow">${t("results_question", { n: i + 1 })}</span>
        <span class="review-tag">${b.isCorrect ? t("results_correct_tag") : t("results_wrong_tag")}</span>
      </div>
      <p class="q-text" style="font-size:0.96rem; margin: 6px 0 10px;">${escapeHtml(b.question)}</p>
      <div class="mini-options">
        ${["A","B","C","D"].map(k => {
          let cls = "";
          if (k === b.correctAnswer) cls = "is-answer";
          if (k === b.given && k !== b.correctAnswer) cls = "is-wrong-pick";
          return `
            <div class="mini-option ${cls}">
              <strong>${k}.</strong> ${escapeHtml(b.options[k] || "")}
              ${k === b.correctAnswer ? `<span class="ans-tag">${t("results_correct_ans")}</span>` : ""}
              ${k === b.given && k !== b.correctAnswer ? `<span class="ans-tag wrong">${t("results_your_ans")}</span>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");

  container.querySelector("#download-result-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `result_${(result.rollId || "student").replace(/[^a-zA-Z0-9_-]/g,"_")}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t("results_downloaded"), "success");
  });
}
