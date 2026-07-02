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
      <div id="github-status-card" class="card mb-3"></div>

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
  renderGitHubStatusCard(container.querySelector("#github-status-card"));
  bindTopbarEvents(container);
}

function renderTopbar(){
  const session = Store.session;
  return `
    <div class="topbar">
      <div class="brand">
        <span class="mark">Q</span>
        <strong>${t("app_name")}</strong>
      </div>
      <div class="who">
        <button class="linklike" id="theme-toggle-btn" title="${t("theme_toggle")}">${Theme.get() === "dark" ? "☀️" : "🌙"}</button>
        <button class="linklike" id="lang-toggle-btn">${t("lang_toggle")}</button>
        <span>${escapeHtml(session?.name || "")} · ${session?.role === "admin" ? t("role_admin") : t("role_student")}</span>
        <button class="linklike" id="logout-btn">${t("logout")}</button>
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

  const themeBtn = container.querySelector("#theme-toggle-btn");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    Theme.toggle();
    Router.resolve(); // re-render current view so the icon/labels stay in sync
  });

  const langBtn = container.querySelector("#lang-toggle-btn");
  if (langBtn) langBtn.addEventListener("click", () => {
    I18N.toggle();
    Router.resolve(); // re-render current view with the new language
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

async function renderGitHubStatusCard(el){
  if (GitHubPublish.isConfigured()){
    el.innerHTML = `<div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> GitHub টোকেন যাচাই হচ্ছে...</div>`;
    try{
      await GitHubPublish.verifyToken();
      el.innerHTML = `
        <div class="flex-between">
          <div>
            <span class="eyebrow">গিটহাব পাবলিশিং</span>
            <p class="mt-1 mb-0">✅ সংযুক্ত — কুইজ সেভ করলেই সরাসরি "${escapeHtml(CONFIG.GITHUB_OWNER)}/${escapeHtml(CONFIG.GITHUB_REPO)}" রিপোতে পাবলিশ হবে।</p>
          </div>
          <button class="linklike-btn" id="forget-github-token" title="টোকেন মুছে ফেলুন">টোকেন মুছুন</button>
        </div>
      `;
      el.querySelector("#forget-github-token").addEventListener("click", () => {
        if (!confirm("সংরক্ষিত GitHub টোকেন মুছে ফেলতে চান?")) return;
        GitHubPublish.clearToken();
        toast("টোকেন মুছে ফেলা হয়েছে।", "success");
        renderGitHubStatusCard(el);
      });
      return;
    }catch(err){
      console.error(err);
      GitHubPublish.clearToken(); // stored token is dead/invalid, clear it
    }
  }

  el.innerHTML = `
    <div>
      <span class="eyebrow">গিটহাব পাবলিশিং</span>
      <p class="mt-1 mb-0">⚠️ সংযুক্ত নয়। কুইজ সরাসরি পাবলিশ করতে GitHub টোকেন যুক্ত করুন।</p>
      <div class="field-row mt-2" style="align-items:flex-end;">
        <div class="field" style="margin-bottom:0; flex:1;">
          <label for="github-token-input">GitHub Personal Access Token</label>
          <input type="password" id="github-token-input" placeholder="github_pat_..." autocomplete="off" />
        </div>
        <button class="btn btn-sm" id="save-github-token-btn">সংযুক্ত করুন</button>
      </div>
      <p class="text-soft text-sm mt-1">
        টোকেন শুধু আপনার ব্রাউজারে (localStorage) সংরক্ষিত হয় — কোনো ফাইলে বা GitHub-এ কমিট হয় না।
        নতুন টোকেন বানাতে <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">এখানে যান</a>
        (Repository access: শুধু quiz-app, Contents: Read and write)।
      </p>
    </div>
  `;

  el.querySelector("#save-github-token-btn").addEventListener("click", async () => {
    const input = el.querySelector("#github-token-input");
    const token = input.value.trim();
    if (!token){ toast("টোকেন দিন।", "error"); return; }

    const btn = el.querySelector("#save-github-token-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> যাচাই হচ্ছে...`;

    GitHubPublish.setToken(token);
    try{
      await GitHubPublish.verifyToken();
      toast("GitHub সংযুক্ত হয়েছে।", "success");
      renderGitHubStatusCard(el);
    }catch(err){
      console.error(err);
      GitHubPublish.clearToken();
      toast("টোকেন যাচাই ব্যর্থ হয়েছে। সঠিক টোকেন ও repo নাম যাচাই করুন।", "error");
      btn.disabled = false;
      btn.textContent = "সংযুক্ত করুন";
    }
  });
}
