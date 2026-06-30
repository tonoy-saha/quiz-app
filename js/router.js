// ── Router ───────────────────────────────────────────────────────────
// Simple hash-based router. Routes are checked in order; the first
// pattern match wins. Each route handler receives the #app container
// element and any captured params.

const Router = {
  routes: [],

  add(pattern, handler){
    // pattern like "/student/take/:fileId" → regex with named groups
    const paramNames = [];
    const regexStr = pattern
      .split("/")
      .map(seg => {
        if (seg.startsWith(":")){
          paramNames.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    this.routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
  },

  resolve(){
    const hash = location.hash.replace(/^#/, "") || "/login";
    const path = hash.split("?")[0];

    for (const route of this.routes){
      const match = path.match(route.regex);
      if (match){
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        route.handler(params);
        return;
      }
    }
    // No match → fall back to login
    location.hash = "#/login";
  },

  start(){
    window.addEventListener("hashchange", () => this.resolve());
    this.resolve();
  },
};
