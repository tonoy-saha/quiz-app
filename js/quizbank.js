// ── Quiz Bank ────────────────────────────────────────────────────────
// A lightweight index of every published quiz, grouped by topic, so
// students can browse and self-practice without needing a specific
// shared link per quiz. The index itself is just another public static
// JSON file (quizzes/bank-index.json) served the same way as quiz
// files — no auth needed to read it.

const QuizBank = {
  INDEX_PATH: "quizzes/bank-index.json",

  // Public read, no auth — used by students browsing the bank.
  async fetchIndexPublic(){
    try{
      const res = await fetch(this.INDEX_PATH, { cache: "no-store" });
      if (!res.ok) return [];
      return await res.json();
    }catch(e){
      console.error("fetchIndexPublic failed:", e);
      return [];
    }
  },

  groupByTopic(index){
    const groups = {};
    index.forEach(entry => {
      const topic = entry.topic || "সাধারণ";
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(entry);
    });
    return groups;
  },

  // Admin-side: add or update this quiz's entry in the shared index,
  // then publish the updated index back to GitHub. Read-modify-write,
  // so it merges with whatever other quizzes are already indexed.
  async upsertEntry(quiz){
    if (!GitHubPublish.isConfigured()) throw new Error("GITHUB_TOKEN_MISSING");

    let index = [];
    try{ index = (await GitHubPublish.getFileContent(this.INDEX_PATH)) || []; }
    catch(e){ console.error("Failed to read bank index, starting fresh:", e); }

    const entry = {
      quizId: quiz.id,
      title: quiz.title,
      topic: quiz.topic || "সাধারণ",
      questionCount: quiz.questions.length,
      updatedAt: new Date().toISOString(),
    };
    const i = index.findIndex(e => e.quizId === quiz.id);
    if (i >= 0) index[i] = entry; else index.push(entry);

    await GitHubPublish.publishJson(this.INDEX_PATH, index, `Update quiz bank index: ${quiz.title}`);
  },

  // Admin-side: remove this quiz's entry (called on delete). Best
  // effort — a failure here shouldn't block the actual quiz deletion.
  async removeEntry(quizId, title){
    if (!GitHubPublish.isConfigured()) return;
    let index = [];
    try{ index = (await GitHubPublish.getFileContent(this.INDEX_PATH)) || []; }
    catch(e){ return; }

    const filtered = index.filter(e => e.quizId !== quizId);
    if (filtered.length === index.length) return; // wasn't indexed, nothing to do

    try{
      await GitHubPublish.publishJson(this.INDEX_PATH, filtered, `Remove from quiz bank index: ${title || quizId}`);
    }catch(e){
      console.error("removeEntry failed (non-fatal):", e);
    }
  },
};
