// ── Grading ─────────────────────────────────────────────────────────

// negativeMarkingFraction: marks deducted per wrong answer, as a
// fraction of one correct mark. E.g. 0.25 = every 4 wrong answers
// cancels 1 correct answer's worth of marks (a common rule in
// Bangladeshi admission tests). 0 or omitted = no negative marking.
// Unanswered questions are never penalized, matching standard rules.
function gradeQuiz(quizQuestions, answers, negativeMarkingFraction){
  const negFrac = negativeMarkingFraction || 0;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const breakdown = quizQuestions.map(q => {
    const given = answers[q.id] || null;
    const isCorrect = given === q.answer;
    if (given === null) unanswered++;
    else if (isCorrect) correct++;
    else incorrect++;
    return { id: q.id, question: q.question, options: q.options, correctAnswer: q.answer, given, isCorrect };
  });

  const total = quizQuestions.length;
  const rawMarks = correct - (incorrect * negFrac);
  // Marks can legitimately go below zero under negative marking (this
  // matches how these exams actually work) — don't floor at 0.
  const marks = Math.round(rawMarks * 100) / 100;
  const percent = total ? Math.round((marks / total) * 100) : 0;

  return {
    total,
    correct,
    incorrect,
    unanswered,
    negativeMarkingFraction: negFrac,
    marks,
    percent,
    breakdown,
  };
}
