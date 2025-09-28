const quizService = require('../services/quizService');
const { QUIZ_SETTINGS, BONUS_SETTINGS } = require('../config/config');

const getLeaderboard = async (req, res) => {
    try {
        const { grade, subject } = req.query;

        if (!grade || !subject) {
            return res.status(400).send({ message: 'Grade and subject must be provided as query parameters.' });
        }
        
        const validGrade = QUIZ_SETTINGS.SUPPORTED_GRADE_LEVELS.includes(grade);
        const validSubject = QUIZ_SETTINGS.SUPPORTED_SUBJECTS.includes(subject);

        if (!validGrade || !validSubject) {
            return res.status(400).send({ message: 'Invalid grade or subject provided.' });
        }

        const leaderboard = await quizService.getLeaderboard(grade, subject);

        res.status(200).send({ 
    message: `Top ${BONUS_SETTINGS.LEADERBOARD.TOP_SCORES_LIMIT} scores for ${grade} ${subject}`,
    leaderboard: leaderboard 
});


    } catch (error) {
        console.error('Leaderboard retrieval error:', error);
        res.status(500).send({ message: 'Internal server error while retrieving leaderboard data.' });
    }
};

module.exports = {
    getLeaderboard
};