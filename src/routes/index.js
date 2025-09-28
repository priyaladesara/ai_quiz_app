const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const quizController = require('../controllers/quizController');
const leaderboardController = require('../controllers/leaderboardController'); // Import new controller
const { authenticateToken } = require('../middleware/authMiddleware');

// --- PUBLIC ROUTES ---

// POST /auth/login - Mock authentication service
router.post('/auth/login', authController.mockLogin);

// GET /leaderboard - Publicly accessible leaderboard (Bonus Feature)
// GET /api/leaderboard?grade=...&subject=...
router.get('/leaderboard', leaderboardController.getLeaderboard);


// --- PROTECTED QUIZ ROUTES (Require JWT) ---

// Apply JWT authentication middleware to all routes below
router.use('/quiz', authenticateToken);

// Generates new quiz (AI + Adaptive Difficulty)
// POST /api/quiz/generate
router.post('/quiz/generate', quizController.createQuiz);

// Submits quiz answers (AI Evaluation + Suggestions, Triggers Email)
// POST /api/quiz/submit
router.post('/quiz/submit', quizController.submitAnswers);

// Retrieves quiz history (Filtered)
// GET /api/quiz/history?grade=...&subject=...&from=...&to=...
router.get('/quiz/history', quizController.getHistory);

// Retrieves quiz for retry (Old submission accessible)
// GET /api/quiz/:quizId/retry
router.get('/quiz/retry/:quizId', quizController.getRetryQuiz);

// Hint Generation (AI)
// GET /api/quiz/hint/:quizId?question_text=...&subject=...
router.get('/quiz/hint/:quizId', quizController.getHint);


module.exports = router;