// ── Admin dashboard ─────────────────────────────────────────────────

function renderAdminDashboard(container){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">অ্যাডমিন প্যানেল</div>
        <h1>ড্যাশবোর্ড</h1>
      </div>

      <div id="drive-status-card" class="card mb-3"></div>

      <div class="grid-2">
        <a href="#/admin/create" class="card" style="text-decoration:none; display:block;">
          <div class="eyebrow">০১</div>
          <h3 class="mt-1">কুইজ তৈরি করুন</h3>
          <p class="text-soft text-sm mt-1">ছবি আপলোড করে OCR দিয়ে প্রশ্ন বের করুন, বা সরাসরি টাইপ করুন।</p>
        </a>
        <a href="#/admin/manage" class="card" style="text-decoration:none; display:block;">
          <div class="eyebrow">০২</div>
          <h3 class="mt-1">কুইজ পরিচালনা করুন</h3>
          <p class="text-soft text-sm mt-1">বিদ্যমান কুইজ দেখুন, সম্পাদনা করুন, রেজাল্ট দেখুন।</p>
        </a>
      </div>
    </div>
  `;

  renderDriveStatusCard(container.querySelector("#drive-status-card"));
  bindTopbarEvents(container);
}

function renderTopbar(){
  const session = Store.session;
  return `
    <div class="topbar">
      <div class="brand">
        <span class="mark">Q</span>
        <strong>MCQ Quiz App</strong>
      </div>
      <div class="who">
        <span>${escapeHtml(session?.name || "")} · ${session?.role === "admin" ? "Admin" : "Student"}</span>
        <button class="linklike" id="logout-btn">লগআউট</button>
      </div>
    </div>
  `;
}

function bindTopbarEvents(container){
  const btn = container.querySelector("#logout-btn");
  if (btn) btn.addEventListener("click", () => {
    Store.logout();
    location.hash = "#/login";
  });
}

async function renderDriveStatusCard(el){
  if (Drive.isConnected()){
    // A token can exist in storage but be expired (Google tokens last
    // ~1hr) — do a cheap real check before trusting it, so we don't
    // show a false "connected" state that then fails silently later.
    el.innerHTML = `<div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> Drive যাচাই হচ্ছে...</div>`;
    try{
      await Drive.ensureRootFolder();
    }catch(err){
      // Token was dead — Drive._authedFetch already cleared it.
      // Fall through to render the "not connected" state below.
    }
  }

  if (Drive.isConnected()){
    el.innerHTML = `
      <div class="flex-between">
        <div>
          <span class="eyebrow">গুগল ড্রাইভ</span>
          <p class="mt-1 mb-0">✅ সংযুক্ত — কুইজ ও রেজাল্ট আপনার Drive-এ "${escapeHtml(CONFIG.DRIVE_ROOT_FOLDER)}" ফোল্ডারে সেভ হবে।</p>
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="flex-between">
      <div>
        <span class="eyebrow">গুগল ড্রাইভ</span>
        <p class="mt-1 mb-0">⚠️ সংযুক্ত নয় (অথবা সংযোগের মেয়াদ শেষ হয়ে গেছে)। কুইজ সেভ/লোড করতে Drive সংযুক্ত করুন।</p>
      </div>
      <button class="btn btn-sm" id="connect-drive-btn">Drive সংযুক্ত করুন</button>
    </div>
  `;
  el.querySelector("#connect-drive-btn").addEventListener("click", async () => {
    const btn = el.querySelector("#connect-drive-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> সংযোগ হচ্ছে...`;
    try{
      await Drive.connect();
      await Drive.ensureRootFolder();
      toast("Google Drive সংযুক্ত হয়েছে।", "success");
      renderDriveStatusCard(el);
    }catch(err){
      console.error(err);
      toast("Drive সংযোগ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");
      btn.disabled = false;
      btn.textContent = "Drive সংযুক্ত করুন";
    }
  });
}
