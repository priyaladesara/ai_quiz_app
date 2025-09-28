-- TABLE 1: Users (For Authentication)

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Stored hashed password (even if mock)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- TABLE 2: Quizzes (Stores the structure of a generated quiz)

CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The user who originally requested the quiz
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, 
    grade_level VARCHAR(50) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    quiz_content JSONB NOT NULL,
    difficulty_adjustment TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- TABLE 3: Submissions (Stores a user's attempt and the result)

CREATE TABLE IF NOT EXISTS submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

    -- Submission details
    user_answers JSONB NOT NULL, 
    final_score DECIMAL(5, 2) NOT NULL, 
    max_score INTEGER NOT NULL,
    ai_suggestions TEXT, 
    status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'retried'
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

 
-- Indexess

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions (completed_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject_grade ON quizzes (subject, grade_level);
