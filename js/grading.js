// ── Grading ─────────────────────────────────────────────────────────

function gradeQuiz(quizQuestions, answers){
  // answers: { [questionId]: "A"|"B"|"C"|"D" }
  let correct = 0;
  const breakdown = quizQuestions.map(q => {
    const given = answers[q.id] || null;
    const isCorrect = given === q.answer;
    if (isCorrect) correct++;
    return { id: q.id, question: q.question, options: q.options, correctAnswer: q.answer, given, isCorrect };
  });
  return {
    total: quizQuestions.length,
    correct,
    incorrect: quizQuestions.length - correct,
    percent: quizQuestions.length ? Math.round((correct / quizQuestions.length) * 100) : 0,
    breakdown,
  };
}
