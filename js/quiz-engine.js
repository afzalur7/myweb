/* === quiz-engine.js — Insurtech & Digital Risk Solutions ===
 * End-of-chapter quiz scoring engine.
 * Usage: scoreQuiz('chXX-quiz', ['a','c','b','d','a'])
 */

(function () {
    'use strict';

    window.scoreQuiz = function (quizId, answerKey) {
        var quiz = document.querySelector('[data-quiz-id="' + quizId + '"]');
        if (!quiz) {
            console.warn('Quiz not found: ' + quizId);
            return;
        }

        var questions = quiz.querySelectorAll('.quiz-question');
        var score = 0;
        var total = answerKey.length;
        var allAnswered = true;

        for (var i = 0; i < total; i++) {
            var qNum = i + 1;
            var selected = quiz.querySelector('input[name="q' + qNum + '"]:checked');
            var feedback = quiz.querySelector('.quiz-question[data-question="' + qNum + '"] .quiz-feedback');

            if (!selected) {
                allAnswered = false;
                if (feedback) {
                    feedback.style.display = 'block';
                    feedback.textContent = 'Please select an answer.';
                    feedback.className = 'quiz-feedback incorrect';
                }
                continue;
            }

            var isCorrect = selected.value === answerKey[i];

            // Highlight options
            var options = quiz.querySelectorAll('.quiz-question[data-question="' + qNum + '"] .quiz-option');
            for (var j = 0; j < options.length; j++) {
                var input = options[j].querySelector('input');
                if (input && input.value === answerKey[i]) {
                    options[j].classList.add('correct');
                }
                if (input && input.value === selected.value && !isCorrect) {
                    options[j].classList.add('incorrect');
                }
            }

            if (feedback) {
                feedback.style.display = 'block';
                feedback.textContent = isCorrect ? 'Correct!' : 'Incorrect. The correct answer is ' + answerKey[i].toUpperCase() + '.';
                feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect');
            }

            if (isCorrect) score++;
        }

        // Show score
        var scoreEl = document.getElementById(quizId + '-score');
        if (scoreEl) {
            scoreEl.style.display = 'block';
            var pct = Math.round((score / total) * 100);
            var grade = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good effort!' : 'Keep studying!';
            scoreEl.textContent = 'Score: ' + score + '/' + total + ' (' + pct + '%) — ' + grade;
            scoreEl.style.color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
            scoreEl.style.background = pct >= 80
                ? 'rgba(0,184,148,0.1)'
                : pct >= 60
                    ? 'rgba(253,203,110,0.1)'
                    : 'rgba(225,112,85,0.1)';
        }

        if (!allAnswered) {
            if (typeof showToast === 'function') {
                showToast('Please answer all questions to see your complete score.', 'warning');
            }
        }

        // Scroll to score
        if (scoreEl) {
            scoreEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    window.resetQuiz = function (quizId) {
        var quiz = document.querySelector('[data-quiz-id="' + quizId + '"]');
        if (!quiz) return;

        var radios = quiz.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radios.length; i++) {
            radios[i].checked = false;
        }

        var options = quiz.querySelectorAll('.quiz-option');
        for (var j = 0; j < options.length; j++) {
            options[j].classList.remove('correct', 'incorrect');
        }

        var feedbacks = quiz.querySelectorAll('.quiz-feedback');
        for (var k = 0; k < feedbacks.length; k++) {
            feedbacks[k].style.display = 'none';
            feedbacks[k].textContent = '';
            feedbacks[k].className = 'quiz-feedback';
        }

        var scoreEl = document.getElementById(quizId + '-score');
        if (scoreEl) {
            scoreEl.style.display = 'none';
            scoreEl.textContent = '';
        }
    };
})();
