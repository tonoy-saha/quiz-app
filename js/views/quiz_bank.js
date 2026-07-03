// ── Quiz Bank view (student) ─────────────────────────────────────────
// Browsable topic list, no link needed. Reuses startQuizFlow (defined
// in take_quiz.js — a plain top-level function, so it's already
// available globally here) by building a synthetic "quiz" object that
// pools every question from every quiz under the chosen topic.

async function renderQuizBank(container){
  container.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="page-head">
        <div class="eyebrow"><a href="#/student">← ড্যাশবোর্ড</a></div>
        <h1>কুইজ ব্যাংক</h1>
        <p class="text-soft text-sm mt-1">একটি বিষয় বেছে নিন — পূর্বে যুক্ত সব প্রশ্ন থেকে এলোমেলোভাবে একটি অনুশীলন পরীক্ষা তৈরি হবে।</p>
      </div>
      <div id="bank-body">
        <div class="flex-gap"><span class="spinner" style="border-color: rgba(27,27,31,0.25); border-top-color: var(--ink);"></span> লোড হচ্ছে...</div>
      </div>
    </div>
  `;
  bindTopbarEvents(container);

  const body = container.querySelector("#bank-body");
  const index = await QuizBank.fetchIndexPublic();

  if (index.length === 0){
    body.innerHTML = `
      <div class="empty-state">
        <div class="glyph">📚</div>
        <p>এখনো কুইজ ব্যাংকে কোনো বিষয় যুক্ত হয়নি।</p>
      </div>
    `;
    return;
  }

  const groups = QuizBank.groupByTopic(index);
  const topics = Object.keys(groups).sort();

  body.innerHTML = topics.map(topic => {
    const entries = groups[topic];
    const totalQuestions = entries.reduce((sum, e) => sum + (e.questionCount || 0), 0);
    const defaultCount = Math.min(20, totalQuestions);
    return `
      <div class="card mb-2" data-topic="${escapeHtml(topic)}">
        <div class="flex-between">
          <div>
            <h3 style="margin:0;">${escapeHtml(topic)}</h3>
            <p class="text-soft text-sm mono mt-1">${totalQuestions}টি প্রশ্ন · ${entries.length}টি কুইজ থেকে</p>
          </div>
        </div>
        <div class="field-row mt-2" style="align-items:flex-end;">
          <div class="field" style="margin-bottom:0;">
            <label>কতটি প্রশ্ন চান?</label>
            <input type="number" class="bank-question-count" min="1" max="${totalQuestions}" value="${defaultCount}" />
          </div>
          <button class="btn start-bank-quiz-btn">পরীক্ষা শুরু করুন</button>
        </div>
      </div>
    `;
  }).join("");

  body.querySelectorAll(".start-bank-quiz-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".card");
      const topic = card.dataset.topic;
      const countInput = card.querySelector(".bank-question-count");
      const wantCount = parseInt(countInput.value, 10) || 10;

      btn.disabled = true;
      const originalLabel = btn.textContent;
      btn.textContent = "লোড হচ্ছে...";

      try{
        const entries = groups[topic];
        const allQuestions = [];
        for (const entry of entries){
          const res = await fetch(`quizzes/${entry.quizId}.json`, { cache: "no-store" });
          if (!res.ok) continue; // skip any quiz that failed to load, don't block the whole bank
          const quizData = await res.json();
          (quizData.questions || []).forEach(q => allQuestions.push(q));
        }

        if (allQuestions.length === 0){
          toast("এই বিষয়ে কোনো প্রশ্ন পাওয়া যায়নি।", "error");
          btn.disabled = false;
          btn.textContent = originalLabel;
          return;
        }

        // Synthetic quiz object — pooled practice, so negative marking
        // and a timer are off by default (this is meant as low-stakes
        // self-practice, not a formal exam). questionsPerAttempt does
        // the actual random-subset selection.
        const syntheticQuiz = {
          title: topic,
          questions: allQuestions,
          negativeMarkingFraction: 0,
          timeLimitMinutes: 0,
          questionsPerAttempt: wantCount,
        };

        startQuizFlow(container, syntheticQuiz, `bank:${topic}`);
      }catch(err){
        console.error(err);
        toast("প্রশ্ন লোড করতে সমস্যা হয়েছে।", "error");
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}
