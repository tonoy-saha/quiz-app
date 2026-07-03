// ── Student dashboard ────────────────────────────────────────────────
// Students don't browse a public list of all quizzes (Drive has no
// simple anonymous "list" capability) — they arrive via a direct link
// the admin copies and shares per quiz. This view is the landing spot
// after student login, in case they came here without a link yet.

function renderStudentDashboard(container){
  const session = Store.session;
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">${t("student_eyebrow")}</div>
        <h1>${t("student_welcome", { name: escapeHtml(session?.name || "") })}</h1>
        <p class="roll-badge mt-1">${t("student_roll_badge", { roll: escapeHtml(session?.rollId || "") })}</p>
      </div>

      <div class="card mb-2">
        <h3 style="margin:0 0 6px;">${t("self_practice_title")}</h3>
        <p class="text-soft text-sm">${t("self_practice_desc")}</p>
        <a href="#/student/self-practice" class="btn mt-1" style="text-decoration:none; display:inline-flex;">${t("self_practice_btn")}</a>
      </div>

      <div class="card mb-2">
        <h3 style="margin:0 0 6px;">${t("quiz_bank_title")}</h3>
        <p class="text-soft text-sm">${t("quiz_bank_desc")}</p>
        <a href="#/student/bank" class="btn mt-1" style="text-decoration:none; display:inline-flex;">${t("quiz_bank_btn")}</a>
      </div>

      <div class="card">
        <p>${t("student_instructions")}</p>
        <p class="text-soft text-sm mt-1">${t("student_paste_hint")}</p>
        <div class="field-row mt-2" style="align-items:flex-end;">
          <div class="field" style="margin-bottom:0;">
            <label for="quiz-link-input">${t("student_link_label")}</label>
            <input type="text" id="quiz-link-input" placeholder="https://.../#/student/take-static/xxxxx" />
          </div>
          <button class="btn" id="go-to-quiz-btn">${t("student_go_btn")}</button>
        </div>
      </div>
    </div>
  `;

  bindTopbarEvents(container);

  container.querySelector("#go-to-quiz-btn").addEventListener("click", () => {
    const raw = container.querySelector("#quiz-link-input").value.trim();
    if (!raw){ toast(t("student_need_link"), "error"); return; }

    const staticMatch = raw.match(/take-static\/([^/?#]+)/);
    if (staticMatch){
      location.hash = `#/student/take-static/${staticMatch[1]}`;
      return;
    }
    const oldMatch = raw.match(/take\/([^/?#]+)/);
    if (oldMatch){
      location.hash = `#/student/take/${oldMatch[1]}`;
      return;
    }
    // Just an ID, no full link — assume the new static format.
    location.hash = `#/student/take-static/${raw}`;
  });
}
