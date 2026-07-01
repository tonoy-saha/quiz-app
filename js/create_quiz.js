// ── Create Quiz view ─────────────────────────────────────────────────
// Two ways to build a question bank:
//   1) Upload images → run in-browser OCR → admin arranges raw text
//      into question + 4 options + correct answer
//   2) Type questions directly into a form
// Both paths feed the same in-memory question list, saved to Drive
// as one quiz JSON file when the admin clicks "save".

function renderCreateQuiz(container){
  const state = {
    title: "",
    questions: [],   // { id, question, options:{A,B,C,D}, answer }
    images: [],      // { file, url, rawText, status }
  };

  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow"><a href="#/admin">← ড্যাশবোর্ড</a></div>
        <h1>নতুন কুইজ তৈরি করুন</h1>
      </div>

      <div class="field">
        <label for="quiz-title">কুইজের নাম</label>
        <input type="text" id="quiz-title" placeholder="যেমন: বাংলা — জাতীয় বিশ্ববিদ্যালয় ভর্তি ২০১৪-১৫" />
      </div>

      <div class="role-toggle" style="max-width:420px;">
        <button data-mode="image" class="active">ছবি থেকে যুক্ত করুন</button>
        <button data-mode="manual">টাইপ করে যুক্ত করুন</button>
      </div>

      <div id="add-mode-slot" class="mt-2"></div>

      <hr class="tear-line" />

      <div class="page-head" style="margin-bottom:14px;">
        <div class="flex-between">
          <h2>প্রশ্নতালিকা <span class="text-soft text-sm mono">(${"" }টি)</span></h2>
        </div>
      </div>
      <div id="question-list"></div>

      <div class="flex-gap mt-3">
        <button class="btn" id="save-quiz-btn">কুইজ সেভ করুন</button>
        <span id="save-status" class="text-soft text-sm"></span>
      </div>
    </div>
  `;

  bindTopbarEvents(container);

  const modeToggle = container.querySelectorAll(".role-toggle button");
  const modeSlot = container.querySelector("#add-mode-slot");
  let mode = "image";

  modeToggle.forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    modeToggle.forEach(x => x.classList.toggle("active", x.dataset.mode === mode));
    renderMode();
  }));

  function renderMode(){
    if (mode === "image") renderImageMode(modeSlot, state, refreshQuestionList);
    else renderManualMode(modeSlot, state, refreshQuestionList);
  }

  function refreshQuestionList(){
    const listEl = container.querySelector("#question-list");
    container.querySelector("h2").innerHTML = `প্রশ্নতালিকা <span class="text-soft text-sm mono">(${state.questions.length}টি)</span>`;

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

  container.querySelector("#save-quiz-btn").addEventListener("click", async () => {
    const titleEl = container.querySelector("#quiz-title");
    const statusEl = container.querySelector("#save-status");
    state.title = titleEl.value.trim();

    if (!state.title){ toast("কুইজের নাম দিন।", "error"); titleEl.focus(); return; }
    if (state.questions.length === 0){ toast("অন্তত একটি প্রশ্ন যুক্ত করুন।", "error"); return; }
    if (!Drive.isConnected()){
      toast("প্রথমে Google Drive সংযুক্ত করুন (ড্যাশবোর্ডে যান)।", "error");
      return;
    }

    const btn = container.querySelector("#save-quiz-btn");
    btn.disabled = true;
    statusEl.textContent = "সেভ হচ্ছে...";

    const quiz = {
      id: uid("quiz"),
      title: state.title,
      createdAt: new Date().toISOString(),
      questions: state.questions,
    };

    try{
      await Drive.saveQuiz(quiz);
      downloadQuizFile(quiz);
      toast("কুইজ সেভ হয়েছে এবং ফাইল ডাউনলোড হয়েছে।", "success");
      showPublishInstructions(quiz);
    }catch(err){
      console.error(err);
      statusEl.textContent = "";
      const msg = String(err?.message || "");
      if (msg.includes("DRIVE_AUTH_EXPIRED")){
        toast("Drive সংযোগের মেয়াদ শেষ। আবার Drive সংযুক্ত করুন।", "error");
      } else {
        toast("সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "error");
      }
    }finally{
      btn.disabled = false;
    }
  });
}

// ── Image → OCR mode ────────────────────────────────────────────────

function renderImageMode(slot, state, onQuestionsChanged){
  slot.innerHTML = `
    <div class="dropzone" id="dropzone">
      <input type="file" id="image-input" accept="image/*" multiple />
      <div class="glyph" style="font-size:1.6rem;">🖼️</div>
      <p><strong>ছবি আপলোড করুন</strong> অথবা এখানে টেনে আনুন</p>
      <p class="text-sm">একসাথে একাধিক ছবি আপলোড করা যাবে</p>
    </div>
    <div class="thumb-row" id="thumb-row"></div>
    <div id="ocr-result-slot" class="mt-2"></div>
  `;

  const dz = slot.querySelector("#dropzone");
  const input = slot.querySelector("#image-input");
  const thumbRow = slot.querySelector("#thumb-row");
  const resultSlot = slot.querySelector("#ocr-result-slot");

  dz.addEventListener("click", () => input.click());
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener("change", () => handleFiles(input.files));

  function handleFiles(fileList){
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    files.forEach(file => {
      const item = { file, url: URL.createObjectURL(file), rawText: "", status: "pending" };
      state.images.push(item);
      renderThumbs();
    });
  }

  function renderThumbs(){
    thumbRow.innerHTML = state.images.map((img, i) => `
      <div class="thumb" data-i="${i}">
        <img src="${img.url}" alt="question image ${i+1}" />
        <button class="remove" data-i="${i}" title="মুছুন">✕</button>
      </div>
    `).join("");
    thumbRow.querySelectorAll(".remove").forEach(btn => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.images.splice(Number(btn.dataset.i), 1);
      renderThumbs();
    }));
    thumbRow.querySelectorAll(".thumb img").forEach(im => im.addEventListener("click", () => {
      const i = Number(im.closest(".thumb").dataset.i);
      runOcrOn(state.images[i]);
    }));
  }

  async function runOcrOn(item){
    resultSlot.innerHTML = `
      <div class="card">
        <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> <span id="ocr-progress">প্রস্তুত হচ্ছে...</span></div>
      </div>
    `;
    const progressEl = resultSlot.querySelector("#ocr-progress");
    try{
      const text = await OCR.extractText(item.file, (m) => {
        if (m.status === "recognizing text"){
          progressEl.textContent = `টেক্সট বের করা হচ্ছে... ${Math.round((m.progress||0)*100)}%`;
        } else if (m.status){
          progressEl.textContent = m.status;
        }
      });
      item.rawText = text;
      item.status = "done";
      showOcrResult(item);
    }catch(err){
      console.error(err);
      resultSlot.innerHTML = `<div class="card"><p class="text-soft">টেক্সট বের করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p></div>`;
    }
  }

  function showOcrResult(item){
    resultSlot.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <span class="eyebrow">OCR ফলাফল — পাঠ্য সম্পাদনা করুন প্রয়োজনে</span>
        </div>
        <textarea id="ocr-text" class="ocr-pad mt-1" style="min-height:160px; width:100%;">${escapeHtml(item.rawText)}</textarea>
        <p class="help-text">টেক্সট থেকে প্রশ্ন আলাদা করে নিচের ফর্মে সাজিয়ে দিন। একটি প্রশ্নের জন্য একবার ফর্ম পূরণ করুন, তারপর "প্রশ্ন যুক্ত করুন" চাপুন।</p>
        <hr class="tear-line" style="margin:18px 0;" />
        ${manualQuestionFormHtml("from-ocr")}
      </div>
    `;
    bindManualForm(resultSlot, "from-ocr", state, onQuestionsChanged, /* clearAfterAdd */ false);
  }
}

// ── Manual entry mode ───────────────────────────────────────────────

function renderManualMode(slot, state, onQuestionsChanged){
  slot.innerHTML = `
    <div class="card">
      ${manualQuestionFormHtml("manual")}
    </div>
  `;
  bindManualForm(slot, "manual", state, onQuestionsChanged, /* clearAfterAdd */ true);
}

function manualQuestionFormHtml(ns){
  return `
    <div class="field">
      <label for="${ns}-question">প্রশ্ন</label>
      <textarea id="${ns}-question" placeholder="প্রশ্নটি এখানে লিখুন বা পেস্ট করুন"></textarea>
    </div>
    <div class="field-row">
      <div class="field"><label for="${ns}-opt-A">অপশন A</label><input type="text" id="${ns}-opt-A" /></div>
      <div class="field"><label for="${ns}-opt-B">অপশন B</label><input type="text" id="${ns}-opt-B" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="${ns}-opt-C">অপশন C</label><input type="text" id="${ns}-opt-C" /></div>
      <div class="field"><label for="${ns}-opt-D">অপশন D</label><input type="text" id="${ns}-opt-D" /></div>
    </div>
    <div class="field">
      <label for="${ns}-answer">সঠিক উত্তর</label>
      <select id="${ns}-answer">
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="D">D</option>
      </select>
    </div>
    <button class="btn" id="${ns}-add-btn">প্রশ্ন যুক্ত করুন</button>
  `;
}

function bindManualForm(root, ns, state, onQuestionsChanged, clearAfterAdd){
  const btn = root.querySelector(`#${ns}-add-btn`);
  btn.addEventListener("click", () => {
    const q = root.querySelector(`#${ns}-question`).value.trim();
    const a = root.querySelector(`#${ns}-opt-A`).value.trim();
    const b = root.querySelector(`#${ns}-opt-B`).value.trim();
    const c = root.querySelector(`#${ns}-opt-C`).value.trim();
    const d = root.querySelector(`#${ns}-opt-D`).value.trim();
    const answer = root.querySelector(`#${ns}-answer`).value;

    if (!q || !a || !b || !c || !d){
      toast("প্রশ্ন ও চারটি অপশন পূরণ করুন।", "error");
      return;
    }

    state.questions.push({
      id: uid("q"),
      question: q,
      options: { A: a, B: b, C: c, D: d },
      answer,
    });

    if (clearAfterAdd){
      root.querySelector(`#${ns}-question`).value = "";
      root.querySelector(`#${ns}-opt-A`).value = "";
      root.querySelector(`#${ns}-opt-B`).value = "";
      root.querySelector(`#${ns}-opt-C`).value = "";
      root.querySelector(`#${ns}-opt-D`).value = "";
      root.querySelector(`#${ns}-answer`).value = "A";
    }

    toast("প্রশ্ন যুক্ত হয়েছে।", "success");
    onQuestionsChanged();
  });
}

// ── Edit existing question dialog (inline, simple) ──────────────────

function openEditDialog(state, qid, onChanged){
  const q = state.questions.find(x => x.id === qid);
  if (!q) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet sheet">
      <h3 class="mb-2">প্রশ্ন সম্পাদনা করুন</h3>
      <div class="field">
        <label>প্রশ্ন</label>
        <textarea id="edit-question">${escapeHtml(q.question)}</textarea>
      </div>
      <div class="field-row">
        <div class="field"><label>A</label><input type="text" id="edit-A" value="${escapeHtml(q.options.A)}" /></div>
        <div class="field"><label>B</label><input type="text" id="edit-B" value="${escapeHtml(q.options.B)}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>C</label><input type="text" id="edit-C" value="${escapeHtml(q.options.C)}" /></div>
        <div class="field"><label>D</label><input type="text" id="edit-D" value="${escapeHtml(q.options.D)}" /></div>
      </div>
      <div class="field">
        <label>সঠিক উত্তর</label>
        <select id="edit-answer">
          ${["A","B","C","D"].map(k => `<option value="${k}" ${q.answer===k?"selected":""}>${k}</option>`).join("")}
        </select>
      </div>
      <div class="flex-gap">
        <button class="btn" id="edit-save">সেভ করুন</button>
        <button class="btn btn-outline" id="edit-cancel">বাতিল</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#edit-cancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector("#edit-save").addEventListener("click", () => {
    q.question = overlay.querySelector("#edit-question").value.trim();
    q.options.A = overlay.querySelector("#edit-A").value.trim();
    q.options.B = overlay.querySelector("#edit-B").value.trim();
    q.options.C = overlay.querySelector("#edit-C").value.trim();
    q.options.D = overlay.querySelector("#edit-D").value.trim();
    q.answer = overlay.querySelector("#edit-answer").value;
    overlay.remove();
    onChanged();
    toast("প্রশ্ন আপডেট হয়েছে।", "success");
  });
}

// ── Publish workflow (static file, not live Drive read) ─────────────
// Google Drive's API cannot serve file downloads to a fully anonymous
// browser (confirmed: 403 "doesn't allow unregistered callers" even on
// "anyone with the link" files — this is a real Drive API limitation,
// not a misconfiguration). So instead, the admin downloads the quiz as
// a plain JSON file and commits it into the GitHub repo's quizzes/
// folder, where GitHub Pages serves it as a normal public static file —
// no auth, no API key, no expiry, no 403s, ever.

function downloadQuizFile(quiz){
  const filename = `${quiz.id}.json`;
  const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showPublishInstructions(quiz){
  const filename = `${quiz.id}.json`;
  const studentLink = `${location.origin}${location.pathname}#/student/take-static/${quiz.id}`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet sheet">
      <h3 class="mb-2">কুইজ পাবলিশ করতে আরেকটি ধাপ বাকি</h3>
      <p class="text-sm">"${escapeHtml(quiz.title)}" ফাইলটি (<code>${filename}</code>) ডাউনলোড হয়েছে। শিক্ষার্থীরা যেন এটি দেখতে পারে, তার জন্য:</p>
      <ol class="text-sm mt-2" style="padding-left: 20px; line-height:1.8;">
        <li>VS Code-এ আপনার প্রজেক্ট ফোল্ডারে <code>quizzes</code> নামে একটি ফোল্ডার তৈরি করুন (না থাকলে)</li>
        <li>ডাউনলোড হওয়া <code>${filename}</code> ফাইলটি সেই <code>quizzes</code> ফোল্ডারে রাখুন</li>
        <li>টার্মিনালে চালান:
          <pre class="ocr-pad mt-1" style="white-space:pre-wrap;">git add .
git commit -m "Publish quiz: ${escapeHtml(quiz.title)}"
git push</pre>
        </li>
        <li>১-২ মিনিট পর নিচের লিংকটি কাজ করবে:</li>
      </ol>
      <div class="field mt-2">
        <input type="text" readonly value="${studentLink}" id="static-link-input" onclick="this.select()" />
      </div>
      <div class="flex-gap mt-2">
        <button class="btn" id="copy-static-link">লিংক কপি করুন</button>
        <button class="btn btn-outline" id="close-instructions">বুঝেছি</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#copy-static-link").addEventListener("click", async () => {
    try{ await navigator.clipboard.writeText(studentLink); toast("লিংক কপি হয়েছে।", "success"); }
    catch(e){ /* readonly input is already selected as fallback */ }
  });

  const closeAndGo = () => { overlay.remove(); location.hash = "#/admin/manage"; };
  overlay.querySelector("#close-instructions").addEventListener("click", closeAndGo);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAndGo(); });
}
