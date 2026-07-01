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
        <div class="eyebrow">শিক্ষার্থী</div>
        <h1>স্বাগতম, ${escapeHtml(session?.name || "")}</h1>
        <p class="roll-badge mt-1">রোল/আইডি: ${escapeHtml(session?.rollId || "")}</p>
      </div>

      <div class="card">
        <p>পরীক্ষা শুরু করতে আপনার শিক্ষক/অ্যাডমিনের পাঠানো কুইজ লিংকে ক্লিক করুন।</p>
        <p class="text-soft text-sm mt-1">লিংক না থাকলে নিচে কুইজ আইডি/লিংক পেস্ট করুন:</p>
        <div class="field-row mt-2" style="align-items:flex-end;">
          <div class="field" style="margin-bottom:0;">
            <label for="quiz-link-input">কুইজ লিংক বা আইডি</label>
            <input type="text" id="quiz-link-input" placeholder="https://.../#/student/take-static/xxxxx বা শুধু xxxxx" />
          </div>
          <button class="btn" id="go-to-quiz-btn">পরীক্ষায় যান</button>
        </div>
      </div>
    </div>
  `;

  bindTopbarEvents(container);

  container.querySelector("#go-to-quiz-btn").addEventListener("click", () => {
    const raw = container.querySelector("#quiz-link-input").value.trim();
    if (!raw){ toast("লিংক বা আইডি দিন।", "error"); return; }

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
