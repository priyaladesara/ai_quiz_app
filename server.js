const express = require('express');
const dotenv = require('dotenv');
const routes = require('./src/routes');
const { query } = require('./src/db/db'); // Import DB connection check

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Simple request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - User: ${req.user ? req.user.username : 'Guest'}`);
    next();
});

// --- API Routes ---
// All API endpoints start with /api
app.use('/api', routes);

// --- Root Route ---
app.get('/', (req, res) => {
    res.send('AI Quizzer Backend Service is running successfully. Access APIs via /api');
});

// --- PUBLIC ROOT /api ROUTE ---
app.get('/api', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Quizzer API</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f9f9f9;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        h1 {
          color: #4CAF50;
        }
        .section {
          margin-bottom: 25px;
        }
        .routes {
          background: #fff;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        ul {
          list-style-type: none;
          padding-left: 0;
        }
        li {
          margin: 8px 0;
          padding: 6px 10px;
          background: #f0f0f0;
          border-radius: 5px;
          font-family: monospace;
        }
        .category {
          font-weight: bold;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <h1>AI Quizzer API</h1>
      <p>Welcome! Here are the available endpoints:</p>

      <div class="section">
        <h2>Public Routes</h2>
        <div class="routes">
          <ul>
            <li>POST /api/auth/login</li>
            <li>GET /api/leaderboard?grade=...&subject=...</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>Quiz Routes (Require JWT)</h2>
        <div class="routes">
          <ul>
            <li>POST /api/quiz/generate</li>
            <li>POST /api/quiz/submit</li>
            <li>GET /api/quiz/history?grade=...&subject=...&from=...&to=...</li>
            <li>GET /api/quiz/retry/:quizId</li>
            <li>GET /api/quiz/hint/:quizId?question_text=...&subject=...</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).send({ 
        message: 'Internal Server Error', 
        details: err.message, 
        // Do not expose stack trace in production
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

// Start the server
async function startServer() {
    try {
        // Run a dummy query to ensure DB connection is active and ready
        await query('SELECT 1;'); 
        
        app.listen(PORT, () => {
            console.log(`\n======================================================`);
            console.log(`  AI Quizzer Server running on port ${PORT}`);
            console.log(`  API Access: http://localhost:${PORT}/api`);
            console.log(`======================================================\n`);
        });
    } catch (error) {
        console.error('\n!!! FATAL: FAILED TO CONNECT TO DATABASE OR START SERVER !!!');
        console.error(error.message);
        process.exit(1);
    }
}

startServer();
