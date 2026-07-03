// ── App boot & route definitions ───────────────────────────────────

const appEl = document.getElementById("app");

function requireRole(role, params, renderFn){
  const session = Store.session;
  if (!session || session.role !== role){
    location.hash = "#/login";
    return;
  }
  renderFn(appEl, params);
}

Router.add("/login", () => {
  // Already logged in? skip straight to the right dashboard.
  const session = Store.session;
  if (session?.role === "admin"){ location.hash = "#/admin"; return; }
  if (session?.role === "student"){ location.hash = "#/student"; return; }
  renderLoginView(appEl);
});

Router.add("/admin", () => requireRole("admin", {}, renderAdminDashboard));
Router.add("/admin/create", () => requireRole("admin", {}, renderCreateQuiz));
Router.add("/admin/manage", () => requireRole("admin", {}, renderManageQuizzes));

Router.add("/student", () => requireRole("student", {}, renderStudentDashboard));
Router.add("/student/self-practice", () => requireRole("student", {}, renderSelfPractice));
Router.add("/student/bank", () => requireRole("student", {}, renderQuizBank));
Router.add("/student/take/:fileId", (params) =>
  requireRole("student", params, (el) => renderTakeQuiz(el, params.fileId))
);
Router.add("/student/take-static/:quizId", (params) =>
  requireRole("student", params, (el) => renderTakeQuizStatic(el, params.quizId))
);
Router.add("/student/results", () => requireRole("student", {}, renderResults));

async function boot(){
  // Build a toast container once.
  if (!document.getElementById("toast-root")){
    const t = document.createElement("div");
    t.id = "toast-root";
    t.className = "toast-root";
    document.body.appendChild(t);
  }

  await Drive.init();
  Drive.restoreFromSession();

  Router.start();
}

boot();
