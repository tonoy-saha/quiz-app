// ── Login view ──────────────────────────────────────────────────────

function renderLoginView(container){
  let role = "student";

  container.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="page-head" style="text-align:center;">
          <div class="eyebrow">প্রশ্নপত্র ০১</div>
          <h1>MCQ পরীক্ষা প্রোগ্রাম</h1>
          <p class="text-soft text-sm mt-1">ছবি থেকে প্রশ্ন তৈরি করুন, শিক্ষার্থীদের পরীক্ষা নিন</p>
        </div>

        <div class="role-toggle">
          <button data-role="student" class="active">শিক্ষার্থী · Student</button>
          <button data-role="admin">অ্যাডমিন · Admin</button>
        </div>

        <div id="login-form-slot"></div>
      </div>
    </div>
  `;

  const slot = container.querySelector("#login-form-slot");
  const toggleBtns = container.querySelectorAll(".role-toggle button");

  function renderForm(){
    toggleBtns.forEach(b => b.classList.toggle("active", b.dataset.role === role));

    if (role === "student"){
      slot.innerHTML = `
        <form id="student-login-form">
          <div class="field">
            <label for="s-name">আপনার নাম · Name</label>
            <input type="text" id="s-name" placeholder="যেমন: তন্ময় সাহা" required />
          </div>
          <div class="field">
            <label for="s-roll">রোল / আইডি · Roll or ID</label>
            <input type="text" id="s-roll" placeholder="যেমন: 2014015" required />
          </div>
          <button class="btn btn-block" type="submit">পরীক্ষায় প্রবেশ করুন</button>
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
            <label for="a-pass">অ্যাডমিন পাসওয়ার্ড · Admin password</label>
            <input type="password" id="a-pass" placeholder="••••••••" required />
          </div>
          <button class="btn btn-block" type="submit">লগইন করুন</button>
          <p class="help-text">এই পাসওয়ার্ড কোডে নির্ধারিত — config.js ফাইলে পরিবর্তন করা যায়।</p>
        </form>
      `;
      slot.querySelector("#admin-login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = slot.querySelector("#a-pass").value;
        if (pass !== CONFIG.ADMIN_PASSWORD){
          toast("পাসওয়ার্ড সঠিক নয়।", "error");
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
