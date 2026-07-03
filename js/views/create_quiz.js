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

      <div class="field">
        <label for="quiz-topic">বিষয় (কুইজ ব্যাংকে এই বিষয়ের অধীনে দেখাবে)</label>
        <input type="text" id="quiz-topic" placeholder="যেমন: বাংলা, সাধারণ জ্ঞান, পদার্থবিজ্ঞান — খালি রাখলে 'সাধারণ' হবে" />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="quiz-negative-marking">নেগেটিভ মার্কিং (ঐচ্ছিক)</label>
          <select id="quiz-negative-marking">
            <option value="0">নেই</option>
            <option value="0.25">১/৪ (৪ ভুলে ১ নম্বর কাটা)</option>
            <option value="0.33">১/৩ (৩ ভুলে ১ নম্বর কাটা)</option>
            <option value="0.5">১/২ (২ ভুলে ১ নম্বর কাটা)</option>
            <option value="1">১/১ (প্রতি ভুলে ১ নম্বর কাটা)</option>
          </select>
        </div>
        <div class="field">
          <label for="quiz-time-limit">সময়সীমা মিনিটে (ঐচ্ছিক, ০ = সীমাহীন)</label>
          <input type="number" id="quiz-time-limit" min="0" placeholder="০" />
        </div>
      </div>
      <div class="field">
        <label for="quiz-questions-per-attempt">প্রতি পরীক্ষায় কতটি প্রশ্ন দেখাবে (ঐচ্ছিক, খালি = সবগুলো)</label>
        <input type="number" id="quiz-questions-per-attempt" min="1" placeholder="যেমন: ২৫ (মোট প্রশ্ন থেকে এলোমেলোভাবে বাছাই হবে)" />
      </div>

      <div class="role-toggle" style="max-width:620px;">
        <button data-mode="bulk" class="active">বাল্ক পেস্ট (প্রস্তাবিত)</button>
        <button data-mode="image">ছবি থেকে (OCR)</button>
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
    if (!GitHubPublish.isConfigured()){
      toast("GitHub টোকেন এখনো কনফিগার করা হয়নি। config.js দেখুন।", "error");
      return;
    }

    const btn = container.querySelector("#save-quiz-btn");
    btn.disabled = true;
    statusEl.textContent = "সেভ হচ্ছে...";

    const negMarking = parseFloat(container.querySelector("#quiz-negative-marking").value) || 0;
    const timeLimit = parseInt(container.querySelector("#quiz-time-limit").value, 10) || 0;
    const perAttempt = parseInt(container.querySelector("#quiz-questions-per-attempt").value, 10) || 0;
    const topic = container.querySelector("#quiz-topic").value.trim() || "সাধারণ";

    const quiz = {
      id: uid("quiz"),
      title: state.title,
      topic,
      createdAt: new Date().toISOString(),
      questions: state.questions,
      negativeMarkingFraction: negMarking,
      timeLimitMinutes: timeLimit,
      questionsPerAttempt: perAttempt,
    };

    try{
      await Drive.saveQuiz(quiz);
      statusEl.textContent = "পাবলিশ হচ্ছে...";
      await GitHubPublish.publishJson(`quizzes/${quiz.id}.json`, quiz, `Publish quiz: ${quiz.title}`);
      statusEl.textContent = "কুইজ ব্যাংক আপডেট হচ্ছে...";
      try{
        await QuizBank.upsertEntry(quiz);
      }catch(bankErr){
        // Non-fatal — the quiz itself published fine, only the browsable
        // bank listing failed. Direct link still works either way.
        console.error("Quiz bank index update failed:", bankErr);
        toast("কুইজ পাবলিশ হয়েছে, তবে কুইজ ব্যাংক তালিকা আপডেট করা যায়নি।", "error");
      }
      toast("কুইজ পাবলিশ হয়েছে! ১-২ মিনিটের মধ্যে লিংকটি কাজ করবে।", "success");
      showPublishSuccess(quiz);
    }catch(err){
      console.error(err);
      statusEl.textContent = "";
      const msg = String(err?.message || "");
      if (msg.includes("DRIVE_AUTH_EXPIRED")){
        toast("Drive সংযোগের মেয়াদ শেষ। আবার Drive সংযুক্ত করুন।", "error");
      } else if (msg.includes("GITHUB_TOKEN_MISSING") || msg.includes("GITHUB_TOKEN_INVALID")){
        toast("কুইজ Drive-এ সেভ হয়েছে কিন্তু পাবলিশ ব্যর্থ হয়েছে — GitHub টোকেন ভুল বা মেয়াদোত্তীর্ণ। config.js যাচাই করুন।", "error");
      } else if (msg.includes("GITHUB_PUBLISH_FAILED") || msg.includes("GITHUB_FETCH_FAILED")){
        toast("কুইজ Drive-এ সেভ হয়েছে কিন্তু GitHub-এ পাবলিশ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");
      } else {
        toast("সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "error");
      }
    }finally{
      btn.disabled = false;
    }
  });
}

// ── Image → OCR mode ────────────────────────────────────────────────

// ── Bulk paste mode ──────────────────────────────────────────────────
// The most accurate and fastest way to get questions in: send the
// question-bank image to Claude in chat, ask it to transcribe into the
// format below, then paste the result here. Claude's own vision reads
// dense/watermarked/small-font Bengali text far more reliably than any
// in-browser OCR engine — this sidesteps OCR accuracy problems
// entirely instead of trying to fix them.

const BULK_FORMAT_EXAMPLE =
`Q: প্রশ্নের লেখা এখানে
A) অপশন ১
B) অপশন ২
C) অপশন ৩
D) অপশন ৪
Answer: A

Q: পরের প্রশ্ন এখানে
A) ...
B) ...
C) ...
D) ...
Answer: C`;

function renderBulkMode(slot, state, onQuestionsChanged){
  slot.innerHTML = `
    <div class="card">
      <p class="help-text">
        সবচেয়ে নির্ভুল উপায়: প্রশ্নব্যাংকের ছবি Claude-কে (এই চ্যাটে) দিন এবং নিচের ফরম্যাটে লিখে দিতে বলুন,
        তারপর ফলাফল এখানে পেস্ট করুন। ব্রাউজার OCR-এর চেয়ে Claude-এর নিজের ছবি পড়ার ক্ষমতা ঘন/জলছাপযুক্ত/ছোট ফন্টের
        বাংলা টেক্সটে অনেক বেশি নির্ভুল।
      </p>
      <div class="field mt-2">
        <label>ফরম্যাট (উদাহরণ)</label>
        <pre class="ocr-pad" style="white-space:pre-wrap; font-size:0.82rem;">${escapeHtml(BULK_FORMAT_EXAMPLE)}</pre>
      </div>
      <div class="field mt-2">
        <label for="bulk-paste-area">এখানে পেস্ট করুন</label>
        <textarea id="bulk-paste-area" style="min-height:220px;" placeholder="Q: ... 
A) ...
B) ...
C) ...
D) ...
Answer: A"></textarea>
      </div>
      <button class="btn" id="parse-bulk-btn">প্রশ্নগুলো যুক্ত করুন</button>
      <p id="bulk-parse-status" class="text-soft text-sm mt-1"></p>
    </div>
  `;

  slot.querySelector("#parse-bulk-btn").addEventListener("click", () => {
    const raw = slot.querySelector("#bulk-paste-area").value;
    const statusEl = slot.querySelector("#bulk-parse-status");
    const parsed = parseBulkQuestions(raw);

    if (parsed.length === 0){
      statusEl.textContent = "";
      toast("কোনো প্রশ্ন পার্স করা যায়নি। ফরম্যাট যাচাই করুন।", "error");
      return;
    }

    parsed.forEach(q => state.questions.push({
      id: uid("q"),
      question: q.question,
      options: q.options,
      answer: q.answer,
    }));

    statusEl.textContent = `${parsed.length}টি প্রশ্ন যুক্ত হয়েছে।`;
    toast(`${parsed.length}টি প্রশ্ন যুক্ত হয়েছে।`, "success");
    slot.querySelector("#bulk-paste-area").value = "";
    onQuestionsChanged();
  });
}

// Parses "Q: ... A) ... B) ... C) ... D) ... Answer: X" blocks, tolerant
// of extra whitespace/newlines within each field, and accepts either
// "Answer:" or "উত্তর:" as the answer marker.
function parseBulkQuestions(text){
  const re = /Q:\s*([\s\S]*?)\s*A\)\s*([\s\S]*?)\s*B\)\s*([\s\S]*?)\s*C\)\s*([\s\S]*?)\s*D\)\s*([\s\S]*?)\s*(?:Answer|উত্তর)\s*:?\s*([A-Da-d])/gi;
  const results = [];
  let match;
  while ((match = re.exec(text)) !== null){
    const [, q, a, b, c, d, ans] = match;
    results.push({
      question: q.trim(),
      options: { A: a.trim(), B: b.trim(), C: c.trim(), D: d.trim() },
      answer: ans.toUpperCase(),
    });
  }
  return results;
}

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
      openCropTool(state.images[i]);
    }));
  }

  function openCropTool(item){
    resultSlot.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <span class="eyebrow">একটি প্রশ্ন নির্বাচন করুন</span>
        </div>
        <p class="help-text mt-1">
          ছবির উপর টেনে শুধু একটি প্রশ্ন (প্রশ্ন + ৪টি অপশন) নির্বাচন করুন — পুরো পৃষ্ঠার বদলে একটি প্রশ্নে OCR চালালে ফলাফল অনেক বেশি নির্ভুল হয়।
        </p>
        <div class="crop-stage mt-2" id="crop-stage">
          <img src="${item.url}" id="crop-img" alt="crop source" draggable="false" />
          <div class="crop-selection" id="crop-selection" hidden></div>
        </div>
        <div class="flex-gap mt-2">
          <button class="btn" id="extract-selection-btn" disabled>নির্বাচিত অংশ থেকে বের করুন</button>
          <button class="btn btn-outline" id="extract-whole-btn">পুরো ছবি থেকে বের করুন</button>
        </div>
      </div>
    `;

    const stage = resultSlot.querySelector("#crop-stage");
    const imgEl = resultSlot.querySelector("#crop-img");
    const selEl = resultSlot.querySelector("#crop-selection");
    const extractSelBtn = resultSlot.querySelector("#extract-selection-btn");
    const extractWholeBtn = resultSlot.querySelector("#extract-whole-btn");

    let dragStart = null;
    let currentRect = null; // in displayed-pixel space, relative to stage

    function pointFromEvent(e){
      const rect = stage.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDrag(e){
      e.preventDefault();
      dragStart = pointFromEvent(e);
      selEl.hidden = false;
    }
    function duringDrag(e){
      if (!dragStart) return;
      e.preventDefault();
      const p = pointFromEvent(e);
      const stageRect = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(stageRect.width, Math.min(dragStart.x, p.x)));
      const y = Math.max(0, Math.min(stageRect.height, Math.min(dragStart.y, p.y)));
      const w = Math.abs(p.x - dragStart.x);
      const h = Math.abs(p.y - dragStart.y);
      currentRect = { x, y, w, h };
      selEl.style.left = `${x}px`;
      selEl.style.top = `${y}px`;
      selEl.style.width = `${w}px`;
      selEl.style.height = `${h}px`;
    }
    function endDrag(){
      dragStart = null;
      extractSelBtn.disabled = !currentRect || currentRect.w < 10 || currentRect.h < 10;
    }

    stage.addEventListener("mousedown", startDrag);
    stage.addEventListener("mousemove", duringDrag);
    window.addEventListener("mouseup", endDrag);
    stage.addEventListener("touchstart", startDrag, { passive: false });
    stage.addEventListener("touchmove", duringDrag, { passive: false });
    stage.addEventListener("touchend", endDrag);

    extractWholeBtn.addEventListener("click", () => runOcrOn(item, null));
    extractSelBtn.addEventListener("click", () => {
      if (!currentRect) return;
      // Convert displayed-pixel selection into natural-image pixel space.
      const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
      const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
      const naturalRect = {
        x: currentRect.x * scaleX,
        y: currentRect.y * scaleY,
        w: currentRect.w * scaleX,
        h: currentRect.h * scaleY,
      };
      runOcrOn(item, naturalRect);
    });
  }

  async function runOcrOn(item, cropRect){
    resultSlot.innerHTML = `
      <div class="card">
        <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> <span id="ocr-progress">প্রস্তুত হচ্ছে...</span></div>
      </div>
    `;
    const progressEl = resultSlot.querySelector("#ocr-progress");
    try{
      let source = item.file;
      if (cropRect){
        source = await cropImageToCanvas(item.url, cropRect);
      }
      const text = await OCR.extractText(source, (m) => {
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

// Crops a rectangular region (in natural-image pixel coordinates) out
// of an image URL and returns it as a canvas, ready to feed into OCR.
function cropImageToCanvas(imageUrl, rect){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(rect.w));
      canvas.height = Math.max(1, Math.round(rect.h));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.w, rect.h,
        0, 0, canvas.width, canvas.height
      );
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
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

// ── Publish (one-click, via GitHub API) ──────────────────────────────
// Quiz files are pushed straight into this repo's quizzes/ folder via
// GitHub's Contents API (see github.js), so a successful save is
// already live — no manual download/move/git-push required. GitHub
// Pages just needs ~1-2 minutes to redeploy after the commit lands.

function showPublishSuccess(quiz){
  const studentLink = `${location.origin}${location.pathname}#/student/take-static/${quiz.id}`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet sheet">
      <h3 class="mb-2">✅ "${escapeHtml(quiz.title)}" পাবলিশ হয়েছে</h3>
      <p class="text-sm">GitHub Pages-এ প্রকাশিত হতে সাধারণত ১-২ মিনিট সময় লাগে। এই লিংকটি শিক্ষার্থীদের পাঠান:</p>
      <div class="field mt-2">
        <input type="text" readonly value="${studentLink}" id="static-link-input" onclick="this.select()" />
      </div>
      <div class="flex-gap mt-2">
        <button class="btn" id="copy-static-link">লিংক কপি করুন</button>
        <button class="btn btn-outline" id="close-instructions">ঠিক আছে</button>
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
