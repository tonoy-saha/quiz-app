// ── Login view ──────────────────────────────────────────────────────

function renderLoginView(container){
  let role = "student";

  container.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="flex-between mb-2">
          <button class="linklike" id="theme-toggle-btn" title="${t("theme_toggle")}">${Theme.get() === "dark" ? "☀️" : "🌙"}</button>
          <button class="linklike" id="lang-toggle-btn">${t("lang_toggle")}</button>
        </div>
        <div class="page-head" style="text-align:center;">
          <div class="eyebrow">${t("login_eyebrow")}</div>
          <h1>${t("login_title")}</h1>
          <p class="text-soft text-sm mt-1">${t("login_subtitle")}</p>
        </div>

        <div class="role-toggle">
          <button data-role="student" class="active">${t("login_role_student")}</button>
          <button data-role="admin">${t("login_role_admin")}</button>
        </div>

        <div id="login-form-slot"></div>
      </div>
    </div>
  `;

  container.querySelector("#theme-toggle-btn").addEventListener("click", () => {
    Theme.toggle();
    renderLoginView(container);
  });
  container.querySelector("#lang-toggle-btn").addEventListener("click", () => {
    I18N.toggle();
    renderLoginView(container);
  });

  const slot = container.querySelector("#login-form-slot");
  const toggleBtns = container.querySelectorAll(".role-toggle button");

  function renderForm(){
    toggleBtns.forEach(b => b.classList.toggle("active", b.dataset.role === role));

    if (role === "student"){
      slot.innerHTML = `
        <form id="student-login-form">
          <div class="field">
            <label for="s-name">${t("login_name_label")}</label>
            <input type="text" id="s-name" placeholder="${t("login_name_ph")}" required />
          </div>
          <div class="field">
            <label for="s-roll">${t("login_roll_label")}</label>
            <input type="text" id="s-roll" placeholder="${t("login_roll_ph")}" required />
          </div>
          <button class="btn btn-block" type="submit">${t("login_enter_exam")}</button>
        </form>
      `;
      slot.querySelector("#student-login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = slot.querySelector("#s-name").value.trim();
        const roll = slot.querySelector("#s-roll").value.trim();
        if (!name || !roll) return;
        Store.loginStudent(name, roll);
        location.hash = "#/student";
      });
    } else {
      slot.innerHTML = `
        <form id="admin-login-form">
          <div class="field">
            <label for="a-pass">${t("login_admin_pass")}</label>
            <input type="password" id="a-pass" placeholder="••••••••" required />
          </div>
          <button class="btn btn-block" type="submit">${t("login_btn")}</button>
          <p class="help-text">${t("login_pass_help")}</p>
        </form>
      `;
      slot.querySelector("#admin-login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = slot.querySelector("#a-pass").value;
        if (pass !== CONFIG.ADMIN_PASSWORD){
          toast(t("login_wrong_pass"), "error");
          return;
        }
        Store.loginAdmin();
        location.hash = "#/admin";
      });
    }
  }

  toggleBtns.forEach(b => b.addEventListener("click", () => {
    role = b.dataset.role;
    renderForm();
  }));

  renderForm();
}
