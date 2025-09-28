const { query } = require('../db/db');
const { generateContent } = require('./aiService');
const { QUIZ_SETTINGS, BONUS_SETTINGS } = require('../config/config');

const QUIZ_SCHEMA = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            question_id: { type: "INTEGER" },
            question_text: { type: "STRING" },
            type: { type: "STRING", enum: ["multiple_choice", "true_false", "short_answer"] },
            options: { type: "ARRAY", items: { type: "STRING" }, description: "Only for multiple_choice" },
            correct_answer: { type: "STRING" },
            difficulty: { type: "STRING", enum: ["easy", "medium", "hard"] }
        },
        required: ["question_id", "question_text", "type", "correct_answer", "difficulty"],
    }
};

async function getAdaptiveDifficultyFactor(userId) {
    const historyQuery = `
        SELECT final_score, max_score 
        FROM submissions 
        WHERE user_id = $1
        ORDER BY completed_at DESC 
        LIMIT 5;
    `;
    const result = await query(historyQuery, [userId]);
    const submissions = result.rows;

    if (submissions.length === 0) {
        return "neutral (suggest maintaining 'medium' difficulty for a baseline assessment)";
    }

    const totalScorePercentage = submissions.reduce((sum, sub) => sum + parseFloat(sub.final_score), 0);
    const averageScorePercentage = totalScorePercentage / submissions.length;

    const { LOW, HIGH } = QUIZ_SETTINGS.ADAPTIVE_THRESHOLD;

    if (averageScorePercentage >= HIGH) {
        return "high performance (suggest increasing difficulty to 'hard')";
    } else if (averageScorePercentage <= LOW) {
        return "low performance (suggest decreasing difficulty to 'easy')";
    } else {
        return "medium performance (suggest maintaining 'medium' difficulty)";
    }
}

async function generateNewQuiz(userId, gradeLevel, subject, numQuestions = 5) {
    const difficultyFactor = await getAdaptiveDifficultyFactor(userId);
    
    const systemInstruction = `You are a professional quiz generator. Your task is to create a quiz in the requested JSON format ONLY. Ensure the quiz balances question difficulty based on the provided user performance factor. Do not include any text outside the JSON array.`;
    
    const userPrompt = `Generate a ${numQuestions}-question quiz on the subject of "${subject}" for a grade level ${gradeLevel} student. The user's past performance suggests: ${difficultyFactor}. Structure the questions to align with this difficulty assessment.`;

    const quizContent = await generateContent(systemInstruction, userPrompt, QUIZ_SCHEMA);

    const adjustmentMatch = difficultyFactor.match(/'([^']+)'/);
    const difficultyAdjustment = adjustmentMatch ? adjustmentMatch[1] : 'medium';

    const insertQuery = `
        INSERT INTO quizzes (user_id, grade_level, subject, quiz_content, difficulty_adjustment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING quiz_id, quiz_content, generated_at;
    `;
    const result = await query(insertQuery, [
        userId, 
        gradeLevel, 
        subject, 
        JSON.stringify(quizContent), 
        difficultyAdjustment
    ]);

    return result.rows[0];
}

async function submitQuiz(userId, quizId, userAnswers) {
    const quizQuery = 'SELECT quiz_content, subject FROM quizzes WHERE quiz_id = $1';
    const quizResult = await query(quizQuery, [quizId]);
    if (quizResult.rows.length === 0) {
        throw new Error(`Quiz ID ${quizId} not found.`);
    }
    const quizQuestions = quizResult.rows[0].quiz_content;
    const quizSubject = quizResult.rows[0].subject;

    let correctCount = 0;
    let maxScore = quizQuestions.length;
    let mistakes = [];

    quizQuestions.forEach(question => {
        const userAnswerObj = userAnswers.find(a => String(a.question_id) === String(question.question_id));
        
        if (!userAnswerObj || !userAnswerObj.answer) {
             // Treat unanswered as wrong
        } else {
            const userAnswer = String(userAnswerObj.answer).toLowerCase().trim();
            const correctAnswer = String(question.correct_answer).toLowerCase().trim();

            if (userAnswer === correctAnswer) {
                correctCount++;
            } else {
                mistakes.push({
                    question: question.question_text,
                    correct_answer: question.correct_answer,
                    user_answer: userAnswerObj.answer
                });
            }
        }
    });

    const finalScore = (correctCount / maxScore) * 100;

    let aiSuggestions = "Excellent work! You achieved a perfect score and need no suggestions.";
    if (mistakes.length > 0) {
        const mistakeSummary = mistakes.map(m => 
            `Mistake on question: "${m.question}". User's answer was "${m.user_answer}", correct is "${m.correct_answer}".`
        ).join('\n');
        
        const systemInstruction = `You are an encouraging and helpful tutor. Your task is to provide exactly 2 concise, actionable improvement tips based ONLY on the student's mistakes below. Respond only with the two tips, separated by a newline.`;
        const userPrompt = `Based on the following quiz mistakes, give two improvement tips:\n\n${mistakeSummary}`;
        
        aiSuggestions = await generateContent(systemInstruction, userPrompt);
    }
    
    const submissionQuery = `
        INSERT INTO submissions (quiz_id, user_id, user_answers, final_score, max_score, ai_suggestions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING submission_id, final_score, ai_suggestions, completed_at;
    `;
    const submissionResult = await query(submissionQuery, [
        quizId, 
        userId, 
        JSON.stringify(userAnswers), 
        finalScore, 
        maxScore, 
        aiSuggestions
    ]);

    return {
        score: finalScore.toFixed(2),
        total_questions: maxScore,
        correct_count: correctCount,
        suggestions: aiSuggestions,
        submission_id: submissionResult.rows[0].submission_id,
        quiz_subject: quizSubject
    };
}


async function generateHint(questionText, subject) {
    const systemInstruction = `You are a creative and supportive tutor. Provide a very subtle, single-sentence hint for the question. The hint should guide the user but MUST NOT reveal the direct answer.`;
    const userPrompt = `Generate a hint for this question on ${subject}: "${questionText}"`;
    
    return generateContent(systemInstruction, userPrompt);
}

async function getQuizHistory(userId, filters) {
    let baseQuery = `
        SELECT
            s.submission_id,
            s.final_score,
            s.max_score,
            s.ai_suggestions,
            s.completed_at,
            q.grade_level,
            q.subject
        FROM submissions s
        JOIN quizzes q ON s.quiz_id = q.quiz_id
        WHERE s.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramIndex = 2;

    if (filters.grade) {
        baseQuery += ` AND q.grade_level ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.grade}%`);
    }
    if (filters.subject) {
        baseQuery += ` AND q.subject ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.subject}%`);
    }
    if (filters.marks && !isNaN(parseFloat(filters.marks))) {
        baseQuery += ` AND s.final_score >= $${paramIndex++}`;
        queryParams.push(parseFloat(filters.marks));
    }
    
    if (filters.from && filters.to) {
        baseQuery += ` AND s.completed_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        queryParams.push(new Date(filters.from).toISOString());
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        queryParams.push(toDate.toISOString());
    }

    baseQuery += ` ORDER BY s.completed_at DESC;`;

    const result = await query(baseQuery, queryParams);
    return result.rows;
}


async function getQuizForRetry(quizId, userId) {
    const quizResult = await query('SELECT * FROM quizzes WHERE quiz_id = $1', [quizId]);
    if (quizResult.rows.length === 0) {
        throw new Error('Quiz not found.');
    }
    const quiz = quizResult.rows[0];

    const submissionsResult = await query(
        'SELECT submission_id, final_score, completed_at, user_answers, ai_suggestions FROM submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY completed_at DESC', 
        [quizId, userId]
    );

    return {
        quiz_id: quiz.quiz_id,
        grade_level: quiz.grade_level,
        subject: quiz.subject,
        questions: quiz.quiz_content,
        past_submissions: submissionsResult.rows,
    };
}


async function getLeaderboard(gradeLevel, subject) {
    const limit = BONUS_SETTINGS.LEADERBOARD.TOP_SCORES_LIMIT;


    const leaderboardQuery = `
        SELECT
            s.final_score,
            s.completed_at,
            u.username,
            q.grade_level,
            q.subject
        FROM submissions s
        JOIN quizzes q ON s.quiz_id = q.quiz_id
        JOIN users u ON s.user_id = u.user_id
        WHERE q.grade_level = $1 AND q.subject = $2
        ORDER BY s.final_score DESC, s.completed_at ASC
        LIMIT $3;
    `;

    const result = await query(leaderboardQuery, [gradeLevel, subject, limit]);
    return result.rows;
}


module.exports = { 
    generateNewQuiz, 
    submitQuiz, 
    generateHint, 
    getQuizHistory, 
    getQuizForRetry,
    getLeaderboard
};