// ── Manage quizzes view ─────────────────────────────────────────────

function renderManageQuizzes(container){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow"><a href="#/admin">← ড্যাশবোর্ড</a></div>
        <h1>কুইজ পরিচালনা</h1>
      </div>
      <div id="manage-body"></div>
    </div>
  `;
  bindTopbarEvents(container);
  loadAndRender(container.querySelector("#manage-body"));
}

async function loadAndRender(body){
  if (!Drive.isConnected()){
    body.innerHTML = `
      <div class="card">
        <p>কুইজ দেখতে আগে Google Drive সংযুক্ত করুন।</p>
        <a href="#/admin" class="btn btn-sm mt-1" style="text-decoration:none; display:inline-flex;">ড্যাশবোর্ডে ফিরে যান</a>
      </div>
    `;
    return;
  }

  body.innerHTML = `<div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> লোড হচ্ছে...</div>`;

  let quizzes = [];
  try{
    quizzes = await Drive.loadAllQuizzes();
  }catch(err){
    console.error(err);
    if (String(err?.message || "").includes("DRIVE_AUTH_EXPIRED")){
      body.innerHTML = `
        <div class="card">
          <p>Drive সংযোগের মেয়াদ শেষ হয়ে গেছে (প্রায় ১ ঘণ্টা পর এটি হয়)। আবার সংযুক্ত করুন।</p>
          <a href="#/admin" class="btn btn-sm mt-1" style="text-decoration:none; display:inline-flex;">ড্যাশবোর্ডে ফিরে যান</a>
        </div>
      `;
    } else {
      body.innerHTML = `<div class="card"><p>কুইজ লোড করতে সমস্যা হয়েছে।</p></div>`;
    }
    return;
  }

  if (quizzes.length === 0){
    body.innerHTML = `
      <div class="empty-state">
        <div class="glyph">📭</div>
        <p>এখনো কোনো কুইজ তৈরি হয়নি।</p>
        <a href="#/admin/create" class="btn mt-2" style="text-decoration:none; display:inline-flex;">কুইজ তৈরি করুন</a>
      </div>
    `;
    return;
  }

  quizzes.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  body.innerHTML = `
    <table class="quiz-table">
      <thead>
        <tr><th>নাম</th><th>প্রশ্ন</th><th>তৈরির তারিখ</th><th></th></tr>
      </thead>
      <tbody>
        ${quizzes.map(q => `
          <tr>
            <td>${escapeHtml(q.title)}</td>
            <td class="mono">${(q.questions||[]).length}</td>
            <td class="mono text-sm">${new Date(q.createdAt).toLocaleDateString("bn-BD")}</td>
            <td>
              <div class="flex-gap">
                <button class="btn btn-sm btn-outline copy-link" data-id="${q.id}" data-fileid="${q._driveFileId}">লিংক কপি</button>
                <button class="btn btn-sm btn-outline view-results" data-id="${q.id}">রেজাল্ট</button>
                <button class="btn btn-sm btn-danger delete-quiz" data-id="${q.id}">মুছুন</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div id="results-panel" class="mt-3"></div>
  `;

  body.querySelectorAll(".copy-link").forEach(btn => btn.addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}#/student/take/${btn.dataset.fileid}`;
    try{
      await navigator.clipboard.writeText(link);
      toast("শিক্ষার্থীদের জন্য লিংক কপি হয়েছে।", "success");
    }catch(e){
      prompt("লিংকটি কপি করুন:", link);
    }
  }));

  body.querySelectorAll(".delete-quiz").forEach(btn => btn.addEventListener("click", async () => {
    const quiz = quizzes.find(q => q.id === btn.dataset.id);
    if (!confirm(`"${quiz.title}" কুইজটি মুছে ফেলতে চান?`)) return;
    btn.disabled = true;
    try{
      await Drive.deleteQuiz(quiz);
      toast("কুইজ মুছে ফেলা হয়েছে।", "success");
      loadAndRender(body);
    }catch(err){
      console.error(err);
      toast("মুছতে সমস্যা হয়েছে।", "error");
      btn.disabled = false;
    }
  }));

  body.querySelectorAll(".view-results").forEach(btn => btn.addEventListener("click", () => {
    const quiz = quizzes.find(q => q.id === btn.dataset.id);
    const panel = body.querySelector("#results-panel");
    renderResultsPanel(panel, quiz);
  }));
}

// Students download their own result as a file (no auto-write to Drive —
// see take_quiz.js / results.js). Admin can import those files here to
// build a combined results table, stored locally in this browser only.

function renderResultsPanel(panel, quiz){
  const imported = getImportedResults(quiz.id);

  panel.innerHTML = `
    <h3 class="mb-2">"${escapeHtml(quiz.title)}" — রেজাল্ট</h3>
    <p class="text-soft text-sm mb-2">
      শিক্ষার্থীরা পরীক্ষা শেষে রেজাল্ট ফাইল ডাউনলোড করবে এবং আপনাকে পাঠাবে।
      সেই ফাইলগুলো এখানে আপলোড করে একসাথে দেখতে পারবেন।
    </p>
    <div class="dropzone" id="result-dropzone" style="padding:20px;">
      <input type="file" id="result-input" accept="application/json" multiple />
      <p><strong>রেজাল্ট ফাইল আপলোড করুন</strong> (.json)</p>
    </div>
    <div id="imported-results-table" class="mt-2"></div>
  `;

  renderImportedTable();

  const dz = panel.querySelector("#result-dropzone");
  const input = panel.querySelector("#result-input");
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    for (const file of Array.from(input.files)){
      try{
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.quizId === quiz.id){
          addImportedResult(quiz.id, data);
        } else {
          toast(`"${file.name}" এই কুইজের রেজাল্ট না।`, "error");
        }
      }catch(err){
        toast(`"${file.name}" পড়া যায়নি।`, "error");
      }
    }
    renderImportedTable();
  });

  function renderImportedTable(){
    const results = getImportedResults(quiz.id);
    const tableEl = panel.querySelector("#imported-results-table");
    if (results.length === 0){
      tableEl.innerHTML = `<p class="text-soft text-sm mt-2">এখনো কোনো রেজাল্ট ফাইল আপলোড হয়নি।</p>`;
      return;
    }
    results.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    tableEl.innerHTML = `
      <table class="quiz-table">
        <thead><tr><th>নাম</th><th>রোল/আইডি</th><th>স্কোর</th><th>সময়</th></tr></thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td>${escapeHtml(r.name)}</td>
              <td class="mono">${escapeHtml(r.rollId)}</td>
              <td class="mono">${r.correct}/${r.total} (${r.percent}%)</td>
              <td class="mono text-sm">${new Date(r.submittedAt).toLocaleString("bn-BD")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
}

function getImportedResults(quizId){
  try{
    const all = JSON.parse(localStorage.getItem("quizapp_imported_results") || "{}");
    return all[quizId] || [];
  }catch(e){ return []; }
}

function addImportedResult(quizId, result){
  let all = {};
  try{ all = JSON.parse(localStorage.getItem("quizapp_imported_results") || "{}"); }catch(e){}
  if (!all[quizId]) all[quizId] = [];
  // de-dupe by rollId + submittedAt
  const exists = all[quizId].some(r => r.rollId === result.rollId && r.submittedAt === result.submittedAt);
  if (!exists) all[quizId].push(result);
  localStorage.setItem("quizapp_imported_results", JSON.stringify(all));
}
