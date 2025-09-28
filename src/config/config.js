const QUIZ_SETTINGS = {
    MIN_QUESTIONS: 1,
    MAX_QUESTIONS: 10,

    DIFFICULTY_LEVELS: ['easy', 'medium', 'hard'],

    SUPPORTED_SUBJECTS: [
        'Chemistry', 
        'Biology', 
        'Physics', 
        'History', 
        'Mathematics', 
        'Geography',
        'Literature',
        'Computer Science'
    ],

    SUPPORTED_GRADE_LEVELS: [
        '5th Grade', 
        '8th Grade', 
        '10th Grade', 
        '12th Grade',
        'College Freshman'
    ],
    ADAPTIVE_THRESHOLD: {
        LOW: 40,
        HIGH: 80,
    },
};

const BONUS_SETTINGS = {
    LEADERBOARD: {
        TOP_SCORES_LIMIT: 10, 
    },

    EMAIL_NOTIFICATIONS: {
        ENABLED: true,
        RESULT_SUBJECT: 'Your AI Quizzer Results Are Ready!',
    }
};


module.exports = {
    QUIZ_SETTINGS,
    BONUS_SETTINGS
};