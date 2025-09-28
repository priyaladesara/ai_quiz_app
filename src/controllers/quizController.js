const quizService = require('../services/quizService');

const createQuiz = async (req, res) => {
    const { grade_level, subject, num_questions = 5 } = req.body;
    const userId = req.user.user_id;

    if (!grade_level || !subject) {
        return res.status(400).json({ message: 'Grade level and subject are required in the request body.' });
    }

    try {
        const quizData = await quizService.generateNewQuiz(userId, grade_level, subject, num_questions);
        
        const safeQuestions = quizData.quiz_content.map(q => {
            const { correct_answer, ...questionWithoutAnswer } = q;
            return questionWithoutAnswer;
        });

        return res.status(201).json({ 
            message: 'Quiz generated successfully. Start the quiz!',
            quiz_id: quizData.quiz_id,
            questions: safeQuestions,
            generated_at: quizData.generated_at
        });
    } catch (error) {
        console.error('Quiz creation failed:', error.message);
        return res.status(500).json({ message: 'Failed to generate quiz due to an internal AI or database error.', details: error.message });
    }
};

const submitAnswers = async (req, res) => {
    const { quiz_id, answers } = req.body;
    const userId = req.user.user_id;

    if (!quiz_id || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Quiz ID and an array of answers are required.' });
    }

    try {
        const evaluationResult = await quizService.submitQuiz(userId, quiz_id, answers);
        return res.json({ 
            message: 'Quiz submitted and evaluated successfully.',
            score: parseFloat(evaluationResult.score),
            total_questions: evaluationResult.total_questions,
            correct_count: evaluationResult.correct_count,
            ai_suggestions: evaluationResult.suggestions, 
            submission_id: evaluationResult.submission_id
        });
    } catch (error) {
        console.error('Quiz submission failed:', error.message);
        if (error.message.includes('Quiz ID')) {
             return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Failed to submit quiz.', details: error.message });
    }
};


const getHistory = async (req, res) => {
    const userId = req.user.user_id;
    const filters = req.query; 

    try {
        const history = await quizService.getQuizHistory(userId, filters);
        return res.json({ 
            message: 'Quiz history retrieved successfully.',
            history: history 
        });
    } catch (error) {
        console.error('History retrieval failed:', error.message);
        return res.status(500).json({ message: 'Failed to retrieve quiz history.', details: error.message });
    }
};

const getRetryQuiz = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.user_id;

    if (!quizId) {
        return res.status(400).json({ message: 'Quiz ID is required for retry.' });
    }

    try {
        const quizData = await quizService.getQuizForRetry(quizId, userId);
        
        const safeQuestions = quizData.questions.map(q => {
            const { correct_answer, ...questionWithoutAnswer } = q;
            return questionWithoutAnswer;
        });

        return res.json({ 
            message: 'Quiz details for retry retrieved successfully. Re-submit answers to re-evaluate.',
            quiz_details: {
                quiz_id: quizData.quiz_id,
                grade_level: quizData.grade_level,
                subject: quizData.subject,
                questions: safeQuestions,
                past_submissions: quizData.past_submissions 
            }
        });
    } catch (error) {
        console.error('Retry quiz retrieval failed:', error.message);
        return res.status(404).json({ message: 'Quiz not found or retrieval failed.', details: error.message });
    }
};


const getHint = async (req, res) => {
    const { question_text, subject } = req.query; 

    if (!question_text || !subject) {
        return res.status(400).json({ message: 'Question text and subject must be provided as query parameters to generate a hint.' });
    }
    
    try {
        const hint = await quizService.generateHint(question_text, subject);
        return res.json({ 
            message: 'Hint generated successfully.',
            hint: hint
        });
    } catch (error) {
        console.error('Hint generation failed:', error.message);
        return res.status(500).json({ message: 'Failed to generate hint.', details: error.message });
    }
};

module.exports = {
    createQuiz,
    submitAnswers,
    getHistory,
    getHint,
    getRetryQuiz
};